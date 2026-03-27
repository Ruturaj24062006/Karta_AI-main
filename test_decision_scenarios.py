from __future__ import annotations

from typing import Dict, Any

from services.scoring_service import calculate_credit_score


def run_case(name: str, extracted_data: Dict[str, Any], fraud_flags: str, news_score: float, loan_amount_requested: float, expected: str) -> bool:
    result = calculate_credit_score(
        extracted_data=extracted_data,
        fraud_flags=fraud_flags,
        news_score=news_score,
        loan_amount_requested=loan_amount_requested,
        fraud_signal_count=int(extracted_data.get("fraud_signal_count", 0) or 0),
    )

    decision = str(result.get("decision", "UNKNOWN")).upper()
    pd = float(result.get("probability_of_default", 0.0) or 0.0)

    ok = decision == expected
    status = "PASS" if ok else "FAIL"

    print(f"[{status}] {name}")
    print(f"  Expected: {expected}")
    print(f"  Actual:   {decision}")
    print(f"  PD:       {pd:.2f}%")
    print(f"  Reason:   {result.get('decision_reasoning', 'N/A')}")
    print()

    return ok


def main() -> None:
    # Test Case A (Fraudulent): 127% GST mismatch + >3 EMI bounces => REJECT
    case_a = {
        "revenue_fy24": 4_500_000.0,
        "revenue_fy23": 5_500_000.0,
        "current_assets": 900_000.0,
        "current_liabilities": 1_800_000.0,
        "total_debt": 6_000_000.0,
        "total_equity": 1_500_000.0,
        "ebit": 150_000.0,
        "interest_expense": 220_000.0,
        "ebitda_margin_percent": 4.5,
        "operating_cash_flow": 180_000.0,
        "data_quality_score": 82.0,
        "emi_bounce_count_12m": 5,
        "gst_mismatch_ratio": 127.0,
        "active_npa_notice": True,
        "systemic_fraud_detected": True,
        "fraud_signal_count": 3,
    }

    # Test Case B (Perfect): clean compliance and strong fundamentals => APPROVE
    case_b = {
        "revenue_fy24": 12_500_000.0,
        "revenue_fy23": 10_000_000.0,
        "current_assets": 6_500_000.0,
        "current_liabilities": 2_000_000.0,
        "total_debt": 1_800_000.0,
        "total_equity": 7_200_000.0,
        "ebit": 2_400_000.0,
        "interest_expense": 300_000.0,
        "ebitda_margin_percent": 22.0,
        "operating_cash_flow": 2_000_000.0,
        "data_quality_score": 94.0,
        "emi_bounce_count_12m": 0,
        "gst_mismatch_ratio": 0.5,
        "active_npa_notice": False,
        "systemic_fraud_detected": False,
        "fraud_signal_count": 0,
    }

    # Test Case C (Stressed): low profitability but no hard fraud/NPA => CONDITIONAL
    case_c = {
        "revenue_fy24": 7_000_000.0,
        "revenue_fy23": 7_400_000.0,
        "current_assets": 2_200_000.0,
        "current_liabilities": 2_000_000.0,
        "total_debt": 4_000_000.0,
        "total_equity": 2_200_000.0,
        "ebit": 260_000.0,
        "interest_expense": 200_000.0,
        "ebitda_margin_percent": 6.0,
        "operating_cash_flow": 450_000.0,
        "data_quality_score": 88.0,
        "emi_bounce_count_12m": 1,
        "gst_mismatch_ratio": 2.0,
        "active_npa_notice": False,
        "systemic_fraud_detected": False,
        "fraud_signal_count": 0,
    }

    passed = []

    passed.append(run_case("Test Case A (Fraudulent)", case_a, fraud_flags="HIGH", news_score=35.0, loan_amount_requested=5_000_000.0, expected="REJECT"))
    passed.append(run_case("Test Case B (Perfect)", case_b, fraud_flags="LOW", news_score=12.0, loan_amount_requested=3_000_000.0, expected="APPROVE"))
    passed.append(run_case("Test Case C (Stressed)", case_c, fraud_flags="LOW", news_score=42.0, loan_amount_requested=4_500_000.0, expected="CONDITIONAL"))

    ok_count = sum(1 for p in passed if p)
    print(f"Summary: {ok_count}/3 scenarios matched expected decisions")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Test suite failed to execute:")
        print(str(exc))
