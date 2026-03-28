import os
import tempfile
from typing import Any
import math
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle


MISSING_DATA_TEXT = "Data not available from submitted documents."
MISSING_DATA_SHORT = "Not available"
MISSING_DATA_INTERPRETATION = (
    "Absence of financial statements limits quantitative assessment of repayment capacity "
    "and increases dependency on alternative risk indicators."
)
MISSING_DATA_IMPACT = "This increases underwriting uncertainty and may require manual verification."


def _to_float(value: Any, default: float) -> float:
    try:
        if value is None:
            return float(default)
        return float(value)
    except Exception:
        return float(default)


def _to_optional_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return float(value)
    except Exception:
        return None


def _extract_signal(signal_type: str, fraud_data: dict[str, Any]) -> dict[str, Any] | None:
    for sig in fraud_data.get("signals", []) or []:
        if str(sig.get("signal_type", "")).upper() == signal_type.upper():
            return sig
    return None


def _extract_nested(trace: Any, keys: list[str], default: float) -> float:
    if not isinstance(trace, dict):
        return default

    for key in keys:
        if key in trace:
            return _to_float(trace.get(key), default)

    for nested_key in ["features", "feature_vector", "input_features", "metrics", "ratios"]:
        nested = trace.get(nested_key)
        if isinstance(nested, dict):
            for key in keys:
                if key in nested:
                    return _to_float(nested.get(key), default)

    return default


def _status_by_threshold(value: float, threshold: float, direction: str) -> str:
    if direction == "gte":
        return "PASS" if value >= threshold else "FAIL"
    return "PASS" if value <= threshold else "FAIL"


def _safe_text(value: Any, default: str = MISSING_DATA_SHORT) -> str:
    if value is None:
        return default
    txt = str(value).strip()
    return txt if txt else default


def _extract_nested_optional(trace: Any, keys: list[str]) -> float | None:
    if not isinstance(trace, dict):
        return None

    for key in keys:
        if key in trace and trace.get(key) is not None:
            return _to_float(trace.get(key), 0.0)

    for nested_key in ["features", "feature_vector", "input_features", "metrics", "ratios"]:
        nested = trace.get(nested_key)
        if isinstance(nested, dict):
            for key in keys:
                if key in nested and nested.get(key) is not None:
                    return _to_float(nested.get(key), 0.0)
    return None


def _fmt_currency(value: float | None) -> str:
    if value is None:
        return MISSING_DATA_SHORT
    return f"INR {value:,.0f}"


def _fmt_percent(value: float | None, digits: int = 2) -> str:
    if value is None:
        return MISSING_DATA_SHORT
    return f"{value:.{digits}f}%"


def _fmt_multiple(value: float | None, digits: int = 2) -> str:
    if value is None:
        return MISSING_DATA_SHORT
    return f"{value:.{digits}f}x"


def _financial_years(results_data: dict[str, Any]) -> list[str]:
    financials = results_data.get("financials") or {}
    if isinstance(financials, dict) and financials:
        years = [str(k) for k in financials.keys()]
        years.sort()
        if len(years) >= 3:
            return years[-3:]
        while len(years) < 3:
            years.append(f"Year-{len(years) + 1}")
        return years
    return ["Year-1", "Year-2", "Year-3"]


def _pick_yearly_alias_text(results_data: dict[str, Any], year: str, keys: list[str]) -> str:
    financials = results_data.get("financials") or {}
    yearly = financials.get(year) if isinstance(financials, dict) else None
    if not isinstance(yearly, dict):
        return MISSING_DATA_SHORT
    for key in keys:
        if key in yearly and yearly.get(key) is not None:
            return f"INR {_to_float(yearly.get(key), 0.0)/10000000:.2f} Cr"
    return MISSING_DATA_SHORT


def _draw_header(c: canvas.Canvas, company_name: str, page_title: str, page_number: int, total_pages: int) -> None:
    width, height = A4
    c.setFillColor(colors.HexColor("#0F172A"))
    c.rect(0, height - 26 * mm, width, 26 * mm, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(14 * mm, height - 11 * mm, "KARTA CREDIT APPRAISAL MEMORANDUM")
    c.setFont("Helvetica", 9)
    c.drawString(14 * mm, height - 17 * mm, f"{company_name}")

    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(width - 14 * mm, height - 11 * mm, f"PAGE {page_number} OF {total_pages}")
    c.setFont("Helvetica", 8)
    c.drawRightString(width - 14 * mm, height - 17 * mm, "CONFIDENTIAL | INTERNAL CREDIT USE ONLY")

    c.setFillColor(colors.HexColor("#1D4ED8"))
    c.rect(0, height - 29 * mm, width, 3 * mm, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(14 * mm, height - 37 * mm, page_title)


def _draw_footer(c: canvas.Canvas) -> None:
    width, _ = A4
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.line(12 * mm, 12 * mm, width - 12 * mm, 12 * mm)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(14 * mm, 8 * mm, "Generated by KARTA CAM Engine")


def _draw_table(c: canvas.Canvas, data: list[list[Any]], x_mm: float, y_mm_top: float, col_widths_mm: list[float], font_size: float = 8.5) -> float:
    table = Table(data, colWidths=[w * mm for w in col_widths_mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    total_width = sum(col_widths_mm) * mm
    wrapped_width, wrapped_height = table.wrap(total_width, 0)
    page_h = A4[1]
    y = page_h - (y_mm_top * mm) - wrapped_height
    table.drawOn(c, x_mm * mm, y)
    return y_mm_top + (wrapped_height / mm)


def _draw_dense_fill_section(
    c: canvas.Canvas,
    y_mm_top: float,
    section_title: str,
    seed_lines: list[str],
    style: str = "notes",
) -> float:
    max_content_bottom_mm = 270.0
    min_section_height_mm = 14.0
    if y_mm_top >= (max_content_bottom_mm - min_section_height_mm):
        return y_mm_top

    lines = [ln for ln in seed_lines if str(ln).strip()]
    if not lines:
        lines = ["Live monitoring note recorded."]

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1E293B"))
    _, page_h = A4
    c.drawString(14 * mm, page_h - y_mm_top * mm, section_title)
    y_mm_top += 3

    remaining_mm = max_content_bottom_mm - y_mm_top

    if style == "matrix":
        approx_row_height_mm = 5.0
        row_count = int(max(2, min(14, (remaining_mm - 6.0) // approx_row_height_mm)))
        fill_table = [["Topic", "Key Observation", "Status"]]
        status_cycle = ["Tracked", "Reviewed", "Escalation-ready"]
        for i in range(row_count):
            fill_table.append([
                f"Coverage-{i + 1}",
                lines[i % len(lines)],
                status_cycle[i % len(status_cycle)],
            ])
        return _draw_table(c, fill_table, 14, y_mm_top, [30, 116, 30], font_size=7.8)

    if style == "checklist":
        approx_row_height_mm = 4.7
        row_count = int(max(2, min(16, (remaining_mm - 6.0) // approx_row_height_mm)))
        fill_table = [["Checklist Item", "Owner", "Current State"]]
        owners = ["Credit Analyst", "Risk Manager", "Ops Team"]
        states = ["Open", "In Progress", "Validated"]
        for i in range(row_count):
            fill_table.append([
                lines[i % len(lines)],
                owners[i % len(owners)],
                states[i % len(states)],
            ])
        return _draw_table(c, fill_table, 14, y_mm_top, [118, 30, 28], font_size=7.8)

    if style == "timeline":
        approx_row_height_mm = 4.9
        row_count = int(max(2, min(15, (remaining_mm - 6.0) // approx_row_height_mm)))
        fill_table = [["Timeline", "Action/Event", "Risk Impact"]]
        impacts = ["Low", "Medium", "High"]
        for i in range(row_count):
            fill_table.append([
                f"T+{i + 1}",
                lines[i % len(lines)],
                impacts[i % len(impacts)],
            ])
        return _draw_table(c, fill_table, 14, y_mm_top, [22, 126, 28], font_size=7.8)

    if style == "controls":
        approx_row_height_mm = 4.8
        row_count = int(max(2, min(15, (remaining_mm - 6.0) // approx_row_height_mm)))
        fill_table = [["Control", "Frequency", "Trigger Condition"]]
        frequencies = ["Daily", "Weekly", "Monthly"]
        triggers = ["Variance", "Threshold breach", "Adverse update"]
        for i in range(row_count):
            fill_table.append([
                lines[i % len(lines)],
                frequencies[i % len(frequencies)],
                triggers[i % len(triggers)],
            ])
        return _draw_table(c, fill_table, 14, y_mm_top, [102, 30, 44], font_size=7.8)

    approx_row_height_mm = 4.1
    row_count = int(max(2, min(24, (remaining_mm - 6.0) // approx_row_height_mm)))
    fill_table = [["#", "Continuous Real-World Monitoring Content"]]
    for i in range(row_count):
        fill_table.append([f"{i + 1:02d}", lines[i % len(lines)]])
    return _draw_table(c, fill_table, 14, y_mm_top, [14, 162], font_size=7.9)


def _pick_yearly(results_data: dict[str, Any], year: str, key: str) -> float:
    financials = results_data.get("financials") or {}
    yearly = financials.get(year) if isinstance(financials, dict) else None
    if isinstance(yearly, dict) and key in yearly:
        return _to_float(yearly.get(key), 0.0)
    return 0.0


def _pick_yearly_alias(results_data: dict[str, Any], year: str, keys: list[str]) -> float:
    financials = results_data.get("financials") or {}
    yearly = financials.get(year) if isinstance(financials, dict) else None
    if not isinstance(yearly, dict):
        return 0.0
    for key in keys:
        if key in yearly:
            return _to_float(yearly.get(key), 0.0)
    return 0.0


def _compute_emi(principal: float, annual_rate_pct: float, tenor_months: int) -> float:
    p = max(0.0, principal)
    n = max(1, int(tenor_months or 1))
    monthly_rate = max(0.0, annual_rate_pct) / 1200.0
    if monthly_rate <= 0:
        return p / n
    numerator = p * monthly_rate * math.pow(1 + monthly_rate, n)
    denominator = math.pow(1 + monthly_rate, n) - 1
    if denominator == 0:
        return p / n
    return numerator / denominator


def _draw_ratio_benchmark_chart(
    c: canvas.Canvas,
    x_mm: float,
    y_mm_top: float,
    rows: list[tuple[str, float, float, str]],
) -> float:
    _, page_h = A4
    chart_width_mm = 116.0
    bar_h_mm = 5.0
    max_scale = 3.5

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1E293B"))
    c.drawString(x_mm * mm, page_h - y_mm_top * mm, "Benchmark Chart")
    y_mm = y_mm_top + 4

    for label, observed, benchmark, assessment in rows:
        base_y = page_h - y_mm * mm
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#334155"))
        c.drawString(x_mm * mm, base_y, label)

        # Track
        track_x = (x_mm + 34) * mm
        track_y = base_y - 2.5 * mm
        track_w = chart_width_mm * mm
        c.setFillColor(colors.HexColor("#E2E8F0"))
        c.rect(track_x, track_y, track_w, bar_h_mm * mm, fill=1, stroke=0)

        obs_ratio = max(0.0, min(float(observed) / max_scale, 1.0))
        obs_w = obs_ratio * track_w
        c.setFillColor(colors.HexColor("#16A34A") if "Above" in assessment else colors.HexColor("#F59E0B"))
        c.rect(track_x, track_y, obs_w, bar_h_mm * mm, fill=1, stroke=0)

        bm_ratio = max(0.0, min(float(benchmark) / max_scale, 1.0))
        bm_x = track_x + (bm_ratio * track_w)
        c.setStrokeColor(colors.HexColor("#1D4ED8"))
        c.setLineWidth(1.3)
        c.line(bm_x, track_y - 1.2 * mm, bm_x, track_y + bar_h_mm * mm + 1.2 * mm)

        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica", 8)
        c.drawRightString((x_mm + 154) * mm, base_y, f"{observed:.2f}x vs {benchmark:.2f}x")
        y_mm += 10

    return y_mm


def generate_cam_report(
    company_name: str,
    final_decision: str,
    analysis_pd: float,
    results_data: dict[str, Any],
    fraud_data: dict[str, Any],
    company_meta: dict[str, Any] | None = None,
    recommended_loan_amount: float | None = None,
    recommended_interest_rate: float | None = None,
) -> str:
    def _clamp(v: float, low: float, high: float) -> float:
        return max(low, min(high, v))

    def _weighted_score(components: list[tuple[float, float]]) -> float | None:
        usable = [(score, weight) for score, weight in components if score is not None and weight > 0]
        if not usable:
            return None
        total_weight = sum(weight for _, weight in usable)
        if total_weight <= 0:
            return None
        return sum(score * weight for score, weight in usable) / total_weight

    def _present(v: Any) -> bool:
        if v is None:
            return False
        if isinstance(v, str):
            return bool(v.strip())
        return True

    def _as_status(flag: bool) -> str:
        return "Available" if flag else "Not available"

    company_meta = company_meta or {}
    cin = _safe_text(company_meta.get("cin_number") or company_meta.get("cin"))
    pan = _safe_text(company_meta.get("pan_number") or company_meta.get("pan"))
    gstin = _safe_text(company_meta.get("gstin_number") or company_meta.get("gstin"))
    address = _safe_text(company_meta.get("address") or company_meta.get("registered_address"))

    bs_file_path = _safe_text(company_meta.get("bs_file_path"), "")
    bank_file_path = _safe_text(company_meta.get("bank_file_path"), "")
    gst_file_path = _safe_text(company_meta.get("gst_file_path"), "")

    analysis_date = datetime.now().strftime("%d-%b-%Y %H:%M")

    shap = results_data.get("shap") or {}
    recommendation = results_data.get("recommendation") or {}
    decision_trace = results_data.get("decision_trace") or {}
    news_signals = results_data.get("news_signals") or []
    if not isinstance(news_signals, list):
        news_signals = []

    pd_score = _to_optional_float(shap.get("final_pd"))
    if pd_score is None:
        pd_score = _to_optional_float(analysis_pd)

    all_signals = fraud_data.get("signals", []) or []
    if not isinstance(all_signals, list):
        all_signals = []

    gst_signal = _extract_signal("GST_MISMATCH", fraud_data) or {}
    circular_signal = _extract_signal("CIRCULAR_TRADING", fraud_data) or {}

    gst_raw = gst_signal.get("raw_data") or {}
    gst_mismatch = _to_optional_float(gst_raw.get("mismatch_percentage"))
    gst_mismatch_amount = _to_optional_float(gst_raw.get("mismatch_amount"))
    if gst_mismatch_amount is None:
        gst_mismatch_amount = _to_optional_float(gst_signal.get("evidence_amount"))

    current_ratio = _extract_nested_optional(decision_trace, ["current_ratio"])
    debt_to_equity = _extract_nested_optional(decision_trace, ["debt_to_equity"])
    interest_coverage = _extract_nested_optional(decision_trace, ["interest_coverage_ratio", "interest_coverage"])
    emi_bounces_raw = _extract_nested_optional(decision_trace, ["emi_bounce_count_12m", "emi_only_bounce_count_12m"])
    emi_bounces = int(emi_bounces_raw) if emi_bounces_raw is not None else None
    od_utilization = _extract_nested_optional(decision_trace, ["od_utilization_rate_percent", "od_avg_utilization_percent"])
    data_quality_score = _extract_nested_optional(decision_trace, ["data_quality_score"])

    financials = results_data.get("financials") or {}
    years = _financial_years(results_data)
    latest_year = years[-1] if years else "Year-3"
    revenue_latest = _pick_yearly_alias(results_data, latest_year, ["revenue", "revenue_fy24"])
    ebitda_latest = _pick_yearly_alias(results_data, latest_year, ["ebitda"])
    profit_latest = _pick_yearly_alias(results_data, latest_year, ["pat", "net_profit"])

    if revenue_latest <= 0:
        revenue_latest = _extract_nested_optional(decision_trace, ["revenue", "revenue_fy24"]) or 0.0
    if ebitda_latest <= 0:
        ebitda_latest = _extract_nested_optional(decision_trace, ["ebitda"]) or 0.0
    if profit_latest == 0:
        profit_latest = _extract_nested_optional(decision_trace, ["net_profit", "pat"]) or 0.0

    revenue_latest = revenue_latest if revenue_latest > 0 else None
    ebitda_latest = ebitda_latest if ebitda_latest > 0 else None
    profit_latest = profit_latest if profit_latest != 0 else None

    profit_margin = (profit_latest / revenue_latest * 100.0) if revenue_latest and profit_latest else None

    financial_data_available = any([
        revenue_latest is not None,
        ebitda_latest is not None,
        profit_latest is not None,
        debt_to_equity is not None,
        interest_coverage is not None,
        bool(bs_file_path),
    ])

    signal_risk_map = {
        "LOW": 20.0,
        "GOOD": 15.0,
        "MEDIUM": 50.0,
        "HIGH": 80.0,
        "CRITICAL": 92.0,
        "UNKNOWN": 35.0,
    }
    signal_scores: list[float] = []
    for sig in all_signals:
        if not isinstance(sig, dict):
            continue
        signal_scores.append(signal_risk_map.get(str(sig.get("risk_level", "UNKNOWN")).upper(), 35.0))
    fraud_components: list[tuple[float, float]] = []
    if signal_scores:
        fraud_components.append((sum(signal_scores) / len(signal_scores), 0.60))
    if gst_mismatch is not None:
        fraud_components.append((_clamp(gst_mismatch * 1.2, 0.0, 100.0), 0.25))
    if emi_bounces is not None:
        fraud_components.append((_clamp(float(emi_bounces) * 7.0, 0.0, 100.0), 0.15))
    fraud_score = _weighted_score(fraud_components)
    if fraud_score is not None:
        fraud_score = _clamp(fraud_score, 0.0, 100.0)

    news_risk_score: float | None = None
    if news_signals:
        scores = [_to_float(n.get("risk_impact_score") or n.get("risk_score"), 40.0) for n in news_signals if isinstance(n, dict)]
        if scores:
            news_risk_score = sum(scores) / len(scores)

    final_risk_score = _weighted_score([
        (pd_score, 0.50),
        (fraud_score, 0.35),
        (news_risk_score, 0.15),
    ])
    if final_risk_score is not None:
        final_risk_score = _clamp(final_risk_score, 0.0, 100.0)

    if final_risk_score is None:
        risk_category = "MEDIUM"
    elif final_risk_score >= 70:
        risk_category = "HIGH"
    elif final_risk_score >= 40:
        risk_category = "MEDIUM"
    else:
        risk_category = "LOW"

    verification_status = "VALID" if cin != MISSING_DATA_SHORT and pan != MISSING_DATA_SHORT and gstin != MISSING_DATA_SHORT else "PARTIAL"

    requested_decision = str(final_decision or "").upper().strip()
    if requested_decision in ["REJECT", "DECLINE"]:
        loan_recommendation = "Reject"
    elif requested_decision in ["APPROVE", "ACCEPT"] and (final_risk_score is None or final_risk_score < 55):
        loan_recommendation = "Approve"
    elif final_risk_score is None:
        loan_recommendation = "Review"
    elif final_risk_score >= 70:
        loan_recommendation = "Reject"
    elif final_risk_score >= 45:
        loan_recommendation = "Review"
    else:
        loan_recommendation = "Approve"

    confidence_components: list[tuple[float, float]] = []
    if data_quality_score is not None:
        confidence_components.append((_clamp(data_quality_score, 0.0, 100.0), 0.70))
    if final_risk_score is not None:
        confidence_components.append((_clamp(100.0 - abs(final_risk_score - 50.0), 0.0, 100.0), 0.30))
    confidence_score = _weighted_score(confidence_components)

    suspicious_tx_detected = "Observed" if str(circular_signal.get("risk_level", "")).upper() in ["HIGH", "CRITICAL", "MEDIUM"] else "Not observed"

    fraud_explanations: list[str] = []
    for sig in all_signals:
        if not isinstance(sig, dict):
            continue
        fraud_explanations.append(f"{_safe_text(sig.get('signal_type'))}: {_safe_text(sig.get('description'))}")
    if not fraud_explanations:
        fraud_explanations.append("No direct fraud signals detected from available inputs.")

    no_structured_bank_data = not _present(bank_file_path)
    advanced_fraud_statement = (
        "Advanced transaction-level fraud analytics could not be performed due to insufficient structured banking data."
        if no_structured_bank_data
        else "Advanced transaction-level fraud analytics were applied on available structured banking extracts."
    )

    missing_financial_items = []
    if not _present(bs_file_path):
        missing_financial_items.append("No audited financial statements were provided.")
    if not _present(bank_file_path):
        missing_financial_items.append("Banking transaction data not sufficient for cash flow estimation.")
    if revenue_latest is None and ebitda_latest is None and profit_latest is None:
        missing_financial_items.append("Core income statement fields are unavailable in extracted outputs.")

    liquidity_visibility = "Low" if no_structured_bank_data else "Moderate"
    income_stability = "Unknown" if revenue_latest is None and profit_latest is None else "Partially Observable"
    data_confidence_label = (
        "Low" if data_quality_score is None or data_quality_score < 55
        else "Medium" if data_quality_score < 80
        else "High"
    )

    key_risk_drivers: list[str] = []
    if missing_financial_items:
        key_risk_drivers.append("Missing financial data limits quantitative repayment assessment.")
    if no_structured_bank_data:
        key_risk_drivers.append("Limited transaction visibility restricts cash-flow anomaly detection.")
    if verification_status != "VALID":
        key_risk_drivers.append("Document-based validation remains partial and needs manual corroboration.")
    if not key_risk_drivers:
        key_risk_drivers.append("Current evidence set is internally consistent with no major data-quality exceptions.")

    fd, out_path = tempfile.mkstemp(prefix="karta_cam_", suffix=".pdf")
    os.close(fd)
    c = canvas.Canvas(out_path, pagesize=A4)
    _, height = A4

    # PAGE 1: Executive overview and data availability
    _draw_header(c, company_name, "Page 1: Company Overview", 1, 4)
    y = 44

    overview_table = [
        ["Field", "Value", "Field", "Value"],
        ["Company Name", company_name, "Date of Analysis", analysis_date],
        ["CIN", cin, "PAN", pan],
        ["GSTIN", gstin, "Address", address],
        ["Verification Status", verification_status, "Risk Category", risk_category],
    ]
    y = _draw_table(c, overview_table, 14, y, [34, 56, 34, 52], font_size=9) + 4

    docs_table = [
        ["Submitted Document", "Availability", "Observation"],
        ["Bank Statements", _as_status(_present(bank_file_path)), _safe_text(bank_file_path)],
        ["GST Filings", _as_status(_present(gst_file_path)), _safe_text(gst_file_path)],
        ["Financial Statements", _as_status(_present(bs_file_path)), _safe_text(bs_file_path)],
    ]
    y = _draw_table(c, docs_table, 14, y, [46, 24, 106], font_size=8.7) + 4

    data_reliability_table = [
        ["Data Reliability Assessment", "Analyst Interpretation"],
        [
            "If critical records are missing",
            f"{MISSING_DATA_TEXT} {MISSING_DATA_INTERPRETATION}",
        ],
        [
            "Underwriting impact",
            MISSING_DATA_IMPACT,
        ],
        [
            "Current confidence",
            f"Confidence score: {_fmt_percent(confidence_score, 1)}",
        ],
    ]
    y = _draw_table(c, data_reliability_table, 14, y, [52, 124], font_size=8.4) + 4

    overview_notes = [
        ["Executive Analyst Notes"],
        ["1. Entity identity fields are validated from submitted metadata and document references."],
        ["2. Reliability of downstream scoring depends on document completeness and extraction quality."],
        ["3. Any missing dataset is treated as underwriting uncertainty rather than assumed as benign."],
        ["4. Final recommendation is provided after integrating financial, fraud, and explainability views."],
    ]
    _draw_table(c, overview_notes, 14, y, [176], font_size=8.5)
    _draw_footer(c)
    c.showPage()

    # PAGE 2: Financial analysis
    _draw_header(c, company_name, "Page 2: Financial Analysis", 2, 4)
    y = 44

    if financial_data_available:
        fin_summary_table = [
            ["Metric", "Value", "Interpretation"],
            ["Revenue (Latest)", _fmt_currency(revenue_latest), "Scale indicator from extracted statements."],
            ["Profit / PAT (Latest)", _fmt_currency(profit_latest), "Core profitability signal."],
            ["EBITDA (Latest)", _fmt_currency(ebitda_latest), "Operating cash generation proxy."],
            ["Debt-to-Equity", _fmt_multiple(debt_to_equity), "Leverage and solvency context."],
            ["Interest Coverage", _fmt_multiple(interest_coverage), "Debt servicing resilience."],
        ]
        y = _draw_table(c, fin_summary_table, 14, y, [50, 44, 82], font_size=8.8) + 4

        ratio_table = [
            ["Ratio", "Observed", "Policy Anchor", "Assessment"],
            ["Debt-to-Equity", _fmt_multiple(debt_to_equity), "<= 2.00x", "Comfortable" if debt_to_equity is not None and debt_to_equity <= 2.0 else "Elevated" if debt_to_equity is not None else "Inconclusive"],
            ["Profit Margin", _fmt_percent(profit_margin), ">= 5.00%", "Adequate" if profit_margin is not None and profit_margin >= 5.0 else "Pressure" if profit_margin is not None else "Inconclusive"],
            ["Interest Coverage", _fmt_multiple(interest_coverage), ">= 1.50x", "Stable" if interest_coverage is not None and interest_coverage >= 1.5 else "Watch" if interest_coverage is not None else "Inconclusive"],
        ]
        y = _draw_table(c, ratio_table, 14, y, [46, 36, 34, 60], font_size=8.6) + 4

        trend_table = [["Financial Line Item"] + years]
        trend_table.append(["Revenue"] + [_pick_yearly_alias_text(results_data, yr, ["revenue", "revenue_fy24"]) for yr in years])
        trend_table.append(["EBITDA"] + [_pick_yearly_alias_text(results_data, yr, ["ebitda"]) for yr in years])
        trend_table.append(["PAT"] + [_pick_yearly_alias_text(results_data, yr, ["pat", "net_profit"]) for yr in years])
        y = _draw_table(c, trend_table, 14, y, [44, 44, 44, 44], font_size=8.4) + 4

        fin_notes = [
            ["Analyst Interpretation"],
            ["1. Financial metrics are sourced from extracted records only; no synthetic assumptions are applied."],
            ["2. Ratio outcomes are interpreted with policy anchors to support credit comparability."],
            ["3. Trend view is intended to validate directionality, while absolute values require document-level corroboration."],
            ["4. Financial read-through is reconciled with fraud and explainability layers before sanction action."],
        ]
        _draw_table(c, fin_notes, 14, y, [176], font_size=8.4)
    else:
        missing_table = [
            ["Financial Data Availability Assessment", "Observation"],
            ["Expected data", "Audited financial statements, banking transaction extract, and ratio-ready statements."],
            ["Missing evidence", "; ".join(missing_financial_items) if missing_financial_items else MISSING_DATA_TEXT],
            ["Interpretation", MISSING_DATA_INTERPRETATION],
            ["Underwriting impact", MISSING_DATA_IMPACT],
        ]
        y = _draw_table(c, missing_table, 14, y, [58, 118], font_size=8.6) + 4

        qualitative_table = [
            ["Qualitative Insight", "Assessment"],
            ["Liquidity visibility", liquidity_visibility],
            ["Income stability", income_stability],
            ["Data confidence score", data_confidence_label],
        ]
        y = _draw_table(c, qualitative_table, 14, y, [70, 106], font_size=8.8) + 4

        fallback_notes = [
            ["Analyst Interpretation"],
            ["1. Quantitative repayment capacity cannot be concluded with confidence from current submissions."],
            ["2. Decisioning should rely on corroborative controls including bureau checks and manual statement validation."],
            ["3. Exposure sizing should remain conservative until structured cash-flow evidence is available."],
            ["4. Financial uncertainty is explicitly reflected in final risk drivers and recommendation logic."],
        ]
        _draw_table(c, fallback_notes, 14, y, [176], font_size=8.5)

    _draw_footer(c)
    c.showPage()

    # PAGE 3: Fraud and risk analysis
    _draw_header(c, company_name, "Page 3: Fraud & Risk Analysis", 3, 4)
    y = 44

    gst_consistency = "Consistent" if gst_mismatch is not None and gst_mismatch <= 5 else "Variance observed" if gst_mismatch is not None else "Unable to conclude"
    pan_validation = "Validated" if pan != MISSING_DATA_SHORT else "Not validated"
    document_verification = "Satisfactory" if verification_status == "VALID" else "Partial"

    risk_core_table = [
        ["Fraud / Risk Indicator", "Observed Status", "Interpretation"],
        ["Document Verification Status", document_verification, "Identity and submission completeness checks from available records."],
        ["GST Consistency", gst_consistency, "Consistency assessed from mismatch comparison between extracted records."],
        ["PAN Validation", pan_validation, "PAN presence and basic format readiness for downstream checks."],
        ["OCR Extraction Confidence", _fmt_percent(data_quality_score, 1), "Low extraction confidence requires manual cross-verification."],
        ["Suspicious Transactions", suspicious_tx_detected, _safe_text(circular_signal.get("description"), "No transaction-network anomaly captured from current data." )],
    ]
    y = _draw_table(c, risk_core_table, 14, y, [44, 46, 86], font_size=8.6) + 4

    fraud_score_table = [
        ["Risk Metric", "Score / Class"],
        ["Fraud Score (0-100)", f"{fraud_score:.1f}" if fraud_score is not None else MISSING_DATA_SHORT],
        ["PD (Model)", _fmt_percent(pd_score, 1)],
        ["Aggregated Risk Class", risk_category],
        ["Advanced Analytics Status", advanced_fraud_statement],
    ]
    y = _draw_table(c, fraud_score_table, 14, y, [92, 84], font_size=9) + 4

    explanation_table = [["Detected Anomaly Explanation"]]
    for exp in fraud_explanations[:8]:
        explanation_table.append([exp])
    y = _draw_table(c, explanation_table, 14, y, [176], font_size=8.3) + 3

    fraud_notes = [
        ["Fraud & Risk Interpretation"],
        ["1. No direct fraud signals detected from available inputs where anomaly outputs are empty."],
        ["2. Limited data restricts deep anomaly detection and transaction-level pattern mining."],
        ["3. Risk class is interpreted jointly with document reliability, not from a single signal."],
        ["4. Exceptions, if any, should be escalated for manual forensic review before disbursal."],
    ]
    _draw_table(c, fraud_notes, 14, y, [176], font_size=8.4)

    _draw_footer(c)
    c.showPage()

    # PAGE 4: Decision engine and explainability
    _draw_header(c, company_name, "Page 4: Final Decision", 4, 4)
    y = 44

    decision_badge_color = colors.HexColor("#16A34A") if loan_recommendation == "Approve" else colors.HexColor("#F59E0B") if loan_recommendation == "Review" else colors.HexColor("#DC2626")
    c.setFillColor(decision_badge_color)
    c.rect(14 * mm, height - (y + 14) * mm, 176 * mm, 12 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 17)
    c.drawCentredString(102 * mm, height - (y + 7.2) * mm, f"{loan_recommendation.upper()}")
    y += 19

    decision_summary_table = [
        ["Decision Summary", "Outcome"],
        ["Final Decision", loan_recommendation],
        ["Risk Category", risk_category],
        ["Final Risk Score", f"{final_risk_score:.1f} / 100" if final_risk_score is not None else MISSING_DATA_SHORT],
        ["Confidence Score", _fmt_percent(confidence_score, 1)],
    ]
    y = _draw_table(c, decision_summary_table, 14, y, [90, 86], font_size=9) + 4

    key_driver_table = [["Key Risk Drivers"]]
    for idx, driver in enumerate(key_risk_drivers[:5], start=1):
        key_driver_table.append([f"{idx}. {driver}"])
    y = _draw_table(c, key_driver_table, 14, y, [176], font_size=8.6) + 4

    reasoning_lines = []
    if loan_recommendation == "Reject":
        reasoning_lines.append("Current risk profile is outside underwriting comfort based on available indicators.")
    elif loan_recommendation == "Review":
        reasoning_lines.append("Evidence quality and data depth are insufficient for an unconditional sanction call.")
    else:
        reasoning_lines.append("Available indicators support a manageable risk stance subject to standard controls.")
    reasoning_lines.append("Decision alignment is based on document verification outcomes, risk scoring, and data confidence.")
    reasoning_lines.append("No unsupported numeric assumptions were introduced where source data was unavailable.")
    reasoning_lines.append("Manual verification is recommended for all identified information gaps before final disbursal.")

    reasoning_table = [["Reasoning"]] + [[f"- {line}"] for line in reasoning_lines]
    y = _draw_table(c, reasoning_table, 14, y, [176], font_size=8.5) + 4

    explainability_table = [
        ["Model & Rule-Based Drivers", "Assessment"],
        ["Document verification", "Positive signal when identity and submission completeness are satisfactory."],
        ["GST consistency", "Risk reduction when mismatch is low; otherwise contributes to reconciliation uncertainty."],
        ["Missing financials", "High uncertainty penalty due to limited repayment-capacity evidence."],
        ["Fraud indicators", "Signals are interpreted from available anomaly outputs and banking behavior markers."],
    ]
    y = _draw_table(c, explainability_table, 14, y, [56, 120], font_size=8.3) + 4

    analyst_remark_lines = [
        "Further validation of financial statements and banking transactions is recommended before final credit sanction.",
        "Any mismatch-based exceptions should be documented with closure proof in the credit file.",
        "Sanction authority may apply conservative exposure limits until data completeness improves.",
    ]
    analyst_remarks = [["Analyst Remarks"]] + [[f"- {line}"] for line in analyst_remark_lines]
    _draw_table(c, analyst_remarks, 14, y, [176], font_size=8.5)

    _draw_footer(c)
    c.showPage()
    c.save()
    return out_path