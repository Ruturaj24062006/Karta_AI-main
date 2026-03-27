import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import Base, SessionLocal, engine
from models.analysis import Analysis
from models.company import Company
from models.fraud import FraudSignal

MOCK_CIN = "U72900MH2026PTC900001"
MOCK_GSTIN = "27ABCDE1234F1Z5"


def _pick_existing_shap_chart() -> str:
    graphs_dir = Path(os.getcwd()) / "graphs"
    if not graphs_dir.exists():
        return ""
    matches = sorted(graphs_dir.glob("shap_waterfall_*.png"))
    if not matches:
        return ""
    return f"/graphs/{matches[0].name}"


def _write_dashboard_json(analysis_id: int) -> None:
    payload = {
        "shap": {
            "shap_chart_url": f"/api/shap-chart/{analysis_id}",
            "shap_factors": [
                {"name": "Current Ratio", "impact": "-6.4"},
                {"name": "Emi Bounce Count 12M", "impact": "-5.8"},
                {"name": "Gst Mismatch Percent", "impact": "+0.5"},
                {"name": "News Risk Score", "impact": "-4.2"},
                {"name": "Debt To Equity", "impact": "-2.1"},
                {"name": "Data Quality Score", "impact": "-1.0"},
            ],
            "base_risk": 16.0,
            "final_pd": 7.8,
        },
        "news_signals": [
            {
                "signal": "Positive earnings outlook and stable order inflows observed.",
                "source": "FinBERT Layer",
                "date": "2026-03-27",
                "risk": "LOW",
                "exact_quote": "Positive earnings outlook and stable order inflows observed.",
            },
            {
                "signal": "No adverse litigation or default-related coverage in the last quarter.",
                "source": "FinBERT Layer",
                "date": "2026-03-27",
                "risk": "LOW",
                "exact_quote": "No adverse litigation or default-related coverage in the last quarter.",
            },
        ],
        "recommendation": {
            "decision_reasoning": (
                "Mock Approved profile: strong liquidity (Current Ratio 2.5), "
                "zero EMI bounces in 12 months, low GST mismatch (0.5%), and "
                "positive FinBERT sentiment."
            ),
            "conditions": [],
            "loan_tenure": 5,
            "interest_rate_breakdown": "6.5% Base Rate + 1.5% Risk Premium",
        },
    }

    data_dir = Path(os.getcwd()) / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out_path = data_dir / f"results_{analysis_id}.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def seed_mock_approved() -> int:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_company = db.query(Company).filter(Company.cin_number == MOCK_CIN).first()
        if existing_company:
            existing_analysis = db.query(Analysis).filter(Analysis.company_id == existing_company.id).first()
            if existing_analysis:
                db.query(FraudSignal).filter(FraudSignal.analysis_id == existing_analysis.id).delete()
                db.delete(existing_analysis)
            db.delete(existing_company)
            db.commit()

        company = Company(
            company_name="Mock Approved Borrower Pvt Ltd",
            cin_number=MOCK_CIN,
            gstin_number=MOCK_GSTIN,
            pan_number="ABCDE1234F",
            loan_amount_requested=150000000.0,
            status="active",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        shap_chart_path = _pick_existing_shap_chart()
        analysis = Analysis(
            company_id=company.id,
            data_quality_score=95.0,
            fraud_risk_level="LOW",
            news_risk_score=8.0,
            probability_of_default=7.8,
            recommended_interest_rate=8.0,
            decision="APPROVE",
            recommended_loan_amount=150000000.0,
            shap_chart_path=shap_chart_path,
            analysis_status="completed",
            progress=100.0,
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        gst_signal = FraudSignal(
            analysis_id=analysis.id,
            signal_type="GST_MISMATCH",
            risk_level="LOW",
            description="GSTR-3B vs GSTR-2A mismatch is 0.5%, within acceptable tolerance.",
            evidence_amount=0.5,
            confidence_score=98.0,
            source="GSTN API cross-verification",
        )
        db.add(gst_signal)
        db.commit()

        _write_dashboard_json(analysis.id)

        return analysis.id
    finally:
        db.close()


if __name__ == "__main__":
    analysis_id = seed_mock_approved()
    print(f"Mock approved borrower inserted with analysis_id={analysis_id}")
    print(f"Open dashboard with: /dashboard?task_id={analysis_id}")
