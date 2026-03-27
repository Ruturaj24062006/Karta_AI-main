from __future__ import annotations

import re
from typing import Any, Dict, Optional


def evaluate_itc_mismatch(total_itc_claimed: float, total_itc_available: float) -> Dict[str, Any]:
    """Compare GSTR-3B ITC claimed vs GSTR-2A ITC available.

    Rule:
    - If mismatch percentage is greater than 10%, flag as
      "High Risk: Potential Circular Trading".
    """
    claimed = float(total_itc_claimed or 0.0)
    available = float(total_itc_available or 0.0)

    mismatch_amount = abs(claimed - available)
    if claimed > 0:
        mismatch_percentage = (mismatch_amount / claimed) * 100.0
    elif available > 0:
        mismatch_percentage = 100.0
    else:
        mismatch_percentage = 0.0

    high_risk = mismatch_percentage > 10.0

    return {
        "total_itc_claimed": round(claimed, 2),
        "total_itc_available": round(available, 2),
        "mismatch_amount": round(mismatch_amount, 2),
        "mismatch_percentage": round(mismatch_percentage, 2),
        "high_risk": high_risk,
        "flag": "High Risk: Potential Circular Trading" if high_risk else "Normal",
    }


def _extract_od_utilization_rate(text: str) -> Optional[float]:
    patterns = [
        r"od\s*(?:account\s*)?(?:utili[sz]ation|utili[sz]ed|usage)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*%",
        r"(\d{1,3}(?:\.\d+)?)\s*%\s*od\s*(?:utili[sz]ation|utili[sz]ed|usage)",
    ]
    for pat in patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            try:
                return float(m.group(1))
            except Exception:
                return None
    return None


def detect_bank_statement_stress(raw_text: str) -> Dict[str, Any]:
    """Stress detector for bank statement text.

    Rules:
    - Count occurrences of "EMI BOUNCE" across statement text.
    - If bounce count > 3 in 12 months, force loan recommendation to Reject.
    - Flag OD utilization at/above 99.7% as a liquidity red flag.
    """
    text = raw_text or ""

    bounce_count = len(re.findall(r"\bemi\s*bounce\b", text, flags=re.IGNORECASE))
    od_utilization_rate = _extract_od_utilization_rate(text)

    emi_bounce_reject = bounce_count > 3
    liquidity_red_flag = bool(od_utilization_rate is not None and od_utilization_rate >= 99.7)

    stress_reasons = []
    if emi_bounce_reject:
        stress_reasons.append(
            f"{bounce_count} EMI BOUNCE events found in the 12-month statement window (>3 threshold)."
        )
    if liquidity_red_flag:
        stress_reasons.append(
            f"OD utilization at {od_utilization_rate:.1f}% indicates near-limit liquidity stress."
        )

    return {
        "emi_bounce_count_12m": bounce_count,
        "emi_bounce_reject": emi_bounce_reject,
        "od_utilization_rate_percent": od_utilization_rate,
        "liquidity_red_flag": liquidity_red_flag,
        "stress_reasons": stress_reasons,
    }
