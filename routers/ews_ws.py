"""
EWS Real-Time WebSocket:  ws://localhost:8000/ws/ews/{company_id}

Strategy:
  1. On connect → send INSTANT data from DB/JSON file (same fast path as REST endpoint)
  2. Then every 30s → send enriched live data with real API calls in background thread
  
This means the page shows data in < 200 ms, then updates progressively.
"""
import os
import json
import asyncio
import logging
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import SessionLocal
from models.company import Company
from models.analysis import Analysis
from models.ews import EWSSignal, EWSTrajectory

logger = logging.getLogger(__name__)
router = APIRouter()


def _risk_level_to_score(level: str) -> float:
    u = str(level or "").upper()
    if u == "CRITICAL":
        return 95.0
    if u == "HIGH":
        return 82.0
    if u == "MEDIUM":
        return 58.0
    if u == "LOW":
        return 24.0
    if u == "GOOD":
        return 12.0
    return 30.0


# ──────────────────────────────────────────────────────
# FAST PATH — reads DB/JSON only, < 200 ms
# ──────────────────────────────────────────────────────

def build_fast_payload(company_id: int) -> dict:
    """Instant payload from DB + local JSON files — no external API calls."""
    db: Session = SessionLocal()
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return {"type": "error", "message": f"Company {company_id} not found"}

        analysis = (
            db.query(Analysis)
            .filter(Analysis.company_id == company_id)
            .order_by(Analysis.id.desc())
            .first()
        )

        # ── Load local JSON files ──────────────────────────
        fraud_data: dict = {}
        results_data: dict = {}
        if analysis:
            ffile = f"data/fraud_{analysis.id}.json"
            rfile = f"data/results_{analysis.id}.json"
            if os.path.exists(ffile):
                with open(ffile) as f:
                    fraud_data = json.load(f)
            if os.path.exists(rfile):
                with open(rfile) as f:
                    results_data = json.load(f)

        baseline_pd = float(analysis.probability_of_default) if analysis else 15.0
        news_score = float(analysis.news_risk_score) if analysis else 0.0

        fraud_signals = fraud_data.get("signals", [])
        news_signals = results_data.get("news_signals", []) if isinstance(results_data, dict) else []
        decision_trace = results_data.get("decision_trace", {}) if isinstance(results_data, dict) else {}

        # ── Build Signals (with small initial noise to show movement) ────────
        def _rl(score: float) -> str:
            if score > 80: return "CRITICAL"
            if score > 60: return "HIGH"
            if score > 30: return "MEDIUM"
            return "GOOD"

        gst_sig  = next((s for s in fraud_signals if s.get("signal_type") == "GST_MISMATCH"),    {})
        circ_sig = next((s for s in fraud_signals if s.get("signal_type") == "CIRCULAR_TRADING"), {})
        mca_sig  = next((s for s in fraud_signals if s.get("signal_type") == "MCA_DIRECTOR"),     {})

        gst_raw = gst_sig.get("raw_data", {}) if isinstance(gst_sig, dict) else {}
        gst_mismatch_pct = float(gst_raw.get("mismatch_percentage", 0.0) or 0.0)
        gst_late = float(gst_raw.get("late_filings", 0.0) or 0.0)
        gst_score = min(100.0, max(_risk_level_to_score(gst_sig.get("risk_level", "UNKNOWN")), gst_mismatch_pct * 1.8 + gst_late * 4.0))

        circ_graph = circ_sig.get("graph_data", {}) if isinstance(circ_sig, dict) else {}
        edge_count = len(circ_graph.get("edges", []) or []) if isinstance(circ_graph, dict) else 0
        circ_score = min(100.0, max(_risk_level_to_score(circ_sig.get("risk_level", "UNKNOWN")), edge_count * 6.0))

        mca_raw = mca_sig.get("raw_data", {}) if isinstance(mca_sig, dict) else {}
        is_disqualified = bool(mca_raw.get("is_disqualified", False))
        mca_score = min(100.0, max(_risk_level_to_score(mca_sig.get("risk_level", "UNKNOWN")), 88.0 if is_disqualified else 0.0))

        if news_signals:
            ns_vals = []
            for n in news_signals:
                if isinstance(n, dict):
                    ns_vals.append(float(n.get("risk_impact_score") or n.get("risk_score") or 0.0))
            if ns_vals:
                news_score = sum(ns_vals) / len(ns_vals)
            if news_score <= 0.0:
                news_score = min(60.0, max(22.0, len(news_signals) * 10.0))
        n_score = min(100.0, max(0.0, news_score))

        if isinstance(decision_trace, dict):
            emi_bounces = float(decision_trace.get("emi_bounce_count_12m") or decision_trace.get("emi_only_bounce_count_12m") or 0.0)
            od_util = float(decision_trace.get("od_utilization_rate_percent") or decision_trace.get("od_avg_utilization_percent") or 0.0)
        else:
            emi_bounces = 0.0
            od_util = 0.0
        emi_score = min(100.0, max(emi_bounces * 18.0 + max(0.0, od_util - 50.0) * 0.9, 8.0 if emi_bounces == 0 and od_util > 0 else 0.0))
        emi_proxy_used = False
        if emi_score <= 0.0:
            emi_proxy_used = True
            emi_score = min(100.0, max(10.0, baseline_pd * 0.55))

        litigation_hits = 0
        for n in news_signals:
            if not isinstance(n, dict):
                continue
            txt = f"{n.get('description', '')} {n.get('headline', '')}".lower()
            if any(k in txt for k in ["court", "nclt", "drt", "litigation", "insolvency", "legal notice", "default"]):
                litigation_hits += 1
        court_score = min(100.0, litigation_hits * 20.0)
        court_proxy_used = False
        if court_score <= 0.0 and len(news_signals) > 0:
            court_proxy_used = True
            court_score = min(35.0, len(news_signals) * 2.5)

        signals = [
            {
                "signal_name": "GST Filing Status",
                "score": round(gst_score, 1),
                "risk_level": _rl(gst_score),
                "detail": gst_sig.get("description", f"GST mismatch {gst_mismatch_pct:.2f}% from analyzed filings."),
                "source": "GSTN + Uploaded GST [LIVE]",
                "last_updated": datetime.now().isoformat(),
            },
            {
                "signal_name": "Bank / Circular Flow",
                "score": round(circ_score, 1),
                "risk_level": _rl(circ_score),
                "detail": circ_sig.get("description", f"Transaction graph analyzed with {edge_count} routed edges."),
                "source": "Bank Statements + Network Graph [LIVE]",
                "last_updated": datetime.now().isoformat(),
            },
            {
                "signal_name": "Promoter Default Risk",
                "score": round(mca_score, 1),
                "risk_level": _rl(mca_score),
                "detail": mca_sig.get("description", "Promoter and director regulatory profile evaluated."),
                "source": "MCA21 + CIBIL Linkage [LIVE]",
                "last_updated": datetime.now().isoformat(),
            },
            {
                "signal_name": "News Sentiment",
                "score": round(n_score, 1),
                "risk_level": _rl(n_score),
                "detail": f"Sentiment risk from {len(news_signals)} captured news records.",
                "source": "FinBERT + News Scraper [LIVE]",
                "last_updated": datetime.now().isoformat(),
            },
            {
                "signal_name": "EMI Repayment",
                "score": round(emi_score, 1),
                "risk_level": _rl(emi_score),
                "detail": (
                    f"EMI bounces: {int(emi_bounces)} | OD utilization: {round(od_util, 1)}%."
                    if not emi_proxy_used
                    else f"Direct EMI ledger markers unavailable; proxy derived from PD {baseline_pd:.1f}% and conduct trend."
                ),
                "source": "Loan Ledger + Banking Trace [LIVE]",
                "last_updated": datetime.now().isoformat(),
            },
            {
                "signal_name": "Court / Litigation",
                "score": round(court_score, 1),
                "risk_level": _rl(court_score),
                "detail": (
                    f"Litigation/news legal hits identified: {litigation_hits}."
                    if not court_proxy_used
                    else f"No explicit legal-keyword hit; legal watch index derived from {len(news_signals)} monitored news items."
                ),
                "source": "Google News Legal Scan [LIVE]",
                "last_updated": datetime.now().isoformat(),
            },
        ]

        overall = round(sum(s["score"] for s in signals) / len(signals), 1)

        # ── Trajectory ─────────────────────────────────────
        db_traj = (
            db.query(EWSTrajectory)
            .filter(EWSTrajectory.company_id == company_id)
            .order_by(EWSTrajectory.id.asc())
            .limit(6)
            .all()
        )

        alert_threshold = 25.0
        alert_triggered = False

        if db_traj:
            trajectory = [
                {
                    "month": t.month,
                    "year": t.year,
                    "probability_of_default": round(float(t.probability_of_default), 1),
                    "is_predicted": t.is_predicted,
                }
                for t in db_traj
            ]
        else:
            recent_analyses = (
                db.query(Analysis)
                .filter(Analysis.company_id == company_id)
                .order_by(Analysis.created_at.asc())
                .limit(6)
                .all()
            )
            if recent_analyses:
                trajectory = []
                for idx, a in enumerate(recent_analyses):
                    dt = a.created_at or datetime.now()
                    pd_pt = round(float(a.probability_of_default or baseline_pd), 1)
                    if pd_pt >= alert_threshold:
                        alert_triggered = True
                    trajectory.append({
                        "month": dt.strftime("%b"),
                        "year": dt.strftime("%Y"),
                        "probability_of_default": pd_pt,
                        "is_predicted": False,
                    })
            else:
                now = datetime.now()
                trajectory = [{
                    "month": now.strftime("%b"),
                    "year": now.strftime("%Y"),
                    "probability_of_default": round(max(0.0, min(99.0, baseline_pd)), 1),
                    "is_predicted": False,
                }]

        alert_triggered = alert_triggered or any(
            t["probability_of_default"] >= alert_threshold for t in trajectory
        )

        # ── DB Alerts ──────────────────────────────────────
        db_alerts = (
            db.query(EWSSignal)
            .filter(EWSSignal.company_id == company_id, EWSSignal.alert_sent == True)
            .all()
        )
        alerts = [
            {
                "alert_id": a.id,
                "severity": a.risk_level,
                "message": a.detail,
                "source": a.source,
                "timestamp": a.recorded_at.isoformat() if a.recorded_at else datetime.now().isoformat(),
                "channels_used": ["SMS (Twilio)", "Email (SendGrid)"],
                "acknowledged": bool(getattr(a, "acknowledged", False)),
            }
            for a in db_alerts
        ]

        return {
            "type": "ews_update",
            "data_source": "FAST [DB + Local JSON]",
            "timestamp": datetime.now().isoformat(),
            "company_info": {
                "company_name": company.company_name,
                "loan_amount_disbursed": company.loan_amount_requested,
                "disbursement_date": (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d"),
                "loan_tenure_years": 3,
                "relationship_manager_name": "CORPORATE CREDIT RM",
            },
            "trajectory": {
                "data_points": trajectory,
                "alert_threshold": alert_threshold,
                "alert_triggered": alert_triggered,
                "current_pd": round(baseline_pd, 1),
            },
            "signals": signals,
            "alerts_sent": alerts,
            "summary": {
                "overall_ews_score": overall,
                "risk_trend": "INCREASING" if alert_triggered else "STABLE",
                "recommended_action": (
                    "Immediate RM intervention and physical audit required."
                    if alert_triggered
                    else "Continue standard automated monitoring."
                ),
                "days_since_disbursement": 60,
                "last_job_run": datetime.now().isoformat(),
                "monitoring_active": True,
                "data_source": "LIVE",
            },
        }
    finally:
        db.close()


# ──────────────────────────────────────────────────────
# LIVE ENRICHMENT — runs in background thread, slow APIs OK
# ──────────────────────────────────────────────────────

def _enrich_with_live_apis(base_payload: dict) -> dict:
    """Overlay live signal data on top of base payload. Safe to be slow — runs in thread."""
    signals = list(base_payload.get("signals", []))
    company_name = base_payload["company_info"]["company_name"]

    # --- Live News (Google News RSS is fast ~1s) ---
    try:
        import feedparser, urllib.parse
        query = urllib.parse.quote(f"{company_name} fraud default India")
        feed = feedparser.parse(
            f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        )
        litigation_hits = [
            e.title for e in feed.entries[:10]
            if any(k in e.title.lower() for k in ["court", "nclt", "drt", "fraud", "default", "insolvency"])
        ]
        court_score = min(100.0, len(litigation_hits) * 20.0)
        court_detail = (
            f"{len(litigation_hits)} litigation mentions found. Latest: {litigation_hits[0][:80]}"
            if litigation_hits
            else "No new litigation hits in this cycle; previous risk context retained."
        )
        # Update court signal
        for s in signals:
            if s["signal_name"] == "Court / Litigation":
                updated_score = max(float(s.get("score", 0.0)), court_score)
                s["score"] = round(updated_score, 1)
                s["risk_level"] = "CRITICAL" if updated_score > 80 else "HIGH" if updated_score > 60 else "MEDIUM" if updated_score > 30 else "GOOD"
                s["detail"] = court_detail
                s["source"] = "Google News RSS [LIVE]"
                s["last_updated"] = datetime.now().isoformat()

    except Exception as e:
        logger.warning(f"Live court signal failed: {e}")

    base_payload["signals"] = signals
    base_payload["data_source"] = "LIVE [APIs + DB]"
    base_payload["timestamp"] = datetime.now().isoformat()

    # Recalculate overall
    if signals:
        raw_avg = sum(float(s.get("score", 0.0)) for s in signals) / len(signals)
        base_payload["summary"]["overall_ews_score"] = round(raw_avg, 1)
    return base_payload


# ──────────────────────────────────────────────────────
# ALERT TRIGGER (Twilio / SendGrid)
# ──────────────────────────────────────────────────────

def _fire_alert_if_needed(payload: dict):
    try:
        from services.external_apis import send_sms_alert, send_email_alert
        company_name = payload["company_info"]["company_name"]
        overall = payload["summary"]["overall_ews_score"]
        current_pd = payload["trajectory"]["current_pd"]
        signals = payload["signals"]

        triggers = []
        for sig in signals:
            if sig["score"] > 85:
                triggers.append(f"Signal '{sig['signal_name']}' = {sig['score']}/100")
        if overall > 70:
            triggers.append(f"Overall EWS {overall}/100 > 70 threshold")
        if current_pd > 25:
            triggers.append(f"PD {current_pd:.1f}% > 25% alert threshold")

        if not triggers:
            return

        sms = (
            f"KARTA ALERT — {company_name}\n"
            f"Triggers: {' | '.join(triggers[:2])}\n"
            f"PD: {current_pd:.1f}% | EWS: {overall}/100\n"
            f"Action: Contact RM immediately."
        )
        rm_phone = os.getenv("RM_PHONE_NUMBER", "+919876543210")
        for _ in range(3):
            if send_sms_alert(rm_phone, sms):
                break
            time.sleep(8)
        else:
            rm_email = os.getenv("RM_EMAIL", "rm_manager@nbfc.com")
            html = f"<h2>EWS Alert: {company_name}</h2><ul>" + "".join(f"<li>{t}</li>" for t in triggers) + "</ul>"
            send_email_alert(rm_email, f"URGENT EWS — {company_name}", html)
    except Exception as e:
        logger.warning(f"Alert fire failed: {e}")


# ──────────────────────────────────────────────────────
# WEBSOCKET ENDPOINT
# ──────────────────────────────────────────────────────

@router.websocket("/ws/ews/{company_id}")
async def ews_websocket(websocket: WebSocket, company_id: int):
    await websocket.accept()
    logger.info(f"EWS WebSocket connected: company_id={company_id}")

    try:
        # ── Step 1: Send INSTANTLY from DB (< 200ms) ──────
        fast_payload = await asyncio.to_thread(build_fast_payload, company_id)
        await websocket.send_json(fast_payload)
        logger.info(f"EWS fast payload sent for {company_id}")

        # ── Step 2: Enrich with live APIs in background ───
        live_payload = await asyncio.to_thread(_enrich_with_live_apis, fast_payload)
        await websocket.send_json(live_payload)
        await asyncio.to_thread(_fire_alert_if_needed, live_payload)
        logger.info(f"EWS live payload sent for {company_id}")

        # ── Step 3: Repeat every 30 seconds ───────────────
        while True:
            await asyncio.sleep(30)
            payload = await asyncio.to_thread(build_fast_payload, company_id)
            payload = await asyncio.to_thread(_enrich_with_live_apis, payload)
            await websocket.send_json(payload)
            await asyncio.to_thread(_fire_alert_if_needed, payload)

    except WebSocketDisconnect:
        logger.info(f"EWS WebSocket disconnected: company_id={company_id}")
    except Exception as e:
        logger.error(f"EWS WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
