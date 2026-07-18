from fastapi.testclient import TestClient

from app.main import app
from app.risk_scoring import SymptomInput, VitalsInput, evaluate_risk

client = TestClient(app)


def test_no_symptoms_or_vitals_is_zero_low():
    result = evaluate_risk([], None)
    assert result.risk_score == 0
    assert result.urgency_level == "LOW"
    assert result.red_flags == []


def test_symptom_severity_alone_scales_score():
    result = evaluate_risk(
        [SymptomInput(symptom_name="Headache", severity=3)], None
    )
    assert result.risk_score == 36  # (3/5) * 60
    assert result.urgency_level == "MEDIUM"
    assert result.red_flags == []


def test_low_spo2_is_flagged_as_emergency():
    result = evaluate_risk([], VitalsInput(spo2=85))
    assert "Critically low oxygen saturation" in result.red_flags[0]
    assert result.urgency_level == "EMERGENCY"
    assert result.risk_score == 75


def test_multiple_red_flags_combine_and_cap_at_100():
    result = evaluate_risk(
        [SymptomInput(symptom_name="Chest pain", severity=5)],
        VitalsInput(spo2=80, heart_rate=140, systolic_bp=200),
    )
    assert result.risk_score == 100
    assert result.urgency_level == "EMERGENCY"
    assert len(result.red_flags) == 3


def test_normal_vitals_produce_no_red_flags():
    result = evaluate_risk(
        [], VitalsInput(heart_rate=72, spo2=98, systolic_bp=118, diastolic_bp=76, temperature=37.0, respiratory_rate=16)
    )
    assert result.red_flags == []
    assert result.risk_score == 0
    assert result.urgency_level == "LOW"


def test_evaluate_endpoint_returns_risk_result():
    response = client.post(
        "/risk/evaluate",
        json={
            "symptoms": [{"symptom_name": "Fever", "severity": 2}],
            "vitals": {"temperature": 39.8},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["urgency_level"] in {"LOW", "MEDIUM", "HIGH", "EMERGENCY"}
    assert "High fever" in body["red_flags"][0]
