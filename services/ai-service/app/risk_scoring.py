"""Rule-based triage risk scoring.

This is an MVP simulation, not a diagnostic model: a fixed set of clinical
red-flag thresholds and a severity average combine into a 0-100 score. It
exists to give the triage flow an explainable, deterministic result end to
end — swapping in a real model later only needs to replace `evaluate_risk`.
"""

from pydantic import BaseModel, Field

URGENCY_THRESHOLDS = [
    (75, "EMERGENCY"),
    (50, "HIGH"),
    (25, "MEDIUM"),
]

CARE_LEVEL_BY_URGENCY = {
    "EMERGENCY": "Emergency room — seek immediate care",
    "HIGH": "Urgent care within a few hours",
    "MEDIUM": "See a doctor within 1-2 days",
    "LOW": "Self-care / monitor at home",
}


class SymptomInput(BaseModel):
    symptom_name: str
    severity: int = Field(ge=1, le=5)
    duration: str | None = None


class VitalsInput(BaseModel):
    heart_rate: int | None = None
    spo2: int | None = None
    systolic_bp: int | None = None
    diastolic_bp: int | None = None
    temperature: float | None = None
    respiratory_rate: int | None = None


class RiskEvaluationRequest(BaseModel):
    symptoms: list[SymptomInput] = []
    vitals: VitalsInput | None = None


class RiskEvaluationResult(BaseModel):
    risk_score: int
    urgency_level: str
    care_level: str
    explanation: str
    red_flags: list[str]


def _vital_flags(vitals: VitalsInput | None) -> list[tuple[int, str]]:
    if vitals is None:
        return []

    flags: list[tuple[int, str]] = []

    # Point values are tiered deliberately: a single "severe" flag alone
    # should land in HIGH (>=50) and two combined should reach EMERGENCY
    # (>=75, capped at 100). Critically low SpO2 is scored high enough to
    # reach EMERGENCY alone — hypoxia is uniquely time-critical (organ
    # damage within minutes) versus e.g. isolated tachycardia.
    if vitals.spo2 is not None:
        if vitals.spo2 < 90:
            flags.append((75, "Critically low oxygen saturation (SpO2 < 90%)"))
        elif vitals.spo2 < 95:
            flags.append((15, "Low oxygen saturation (SpO2 < 95%)"))

    if vitals.heart_rate is not None:
        if vitals.heart_rate > 130:
            flags.append((50, "Severe tachycardia (heart rate > 130 bpm)"))
        elif vitals.heart_rate > 100:
            flags.append((10, "Elevated heart rate (> 100 bpm)"))
        elif vitals.heart_rate < 40:
            flags.append((55, "Severe bradycardia (heart rate < 40 bpm)"))
        elif vitals.heart_rate < 50:
            flags.append((15, "Low heart rate (< 50 bpm)"))

    if vitals.systolic_bp is not None:
        if vitals.systolic_bp > 180:
            flags.append((50, "Hypertensive crisis (systolic BP > 180)"))
        elif vitals.systolic_bp < 90:
            flags.append((55, "Hypotension (systolic BP < 90) — possible shock"))

    if vitals.diastolic_bp is not None and vitals.diastolic_bp > 120:
        flags.append((20, "Severely elevated diastolic BP (> 120)"))

    if vitals.temperature is not None:
        if vitals.temperature > 39.5:
            flags.append((20, "High fever (> 39.5°C)"))
        elif vitals.temperature > 38.0:
            flags.append((8, "Fever (> 38.0°C)"))

    if vitals.respiratory_rate is not None:
        if vitals.respiratory_rate > 30:
            flags.append((50, "Severe tachypnea (respiratory rate > 30)"))
        elif vitals.respiratory_rate < 8:
            flags.append((55, "Dangerously low respiratory rate (< 8)"))

    return flags


def _urgency_for_score(score: int) -> str:
    for threshold, level in URGENCY_THRESHOLDS:
        if score >= threshold:
            return level
    return "LOW"


def evaluate_risk(
    symptoms: list[SymptomInput], vitals: VitalsInput | None
) -> RiskEvaluationResult:
    factors: list[str] = []

    severity_score = 0.0
    if symptoms:
        avg_severity = sum(s.severity for s in symptoms) / len(symptoms)
        severity_score = (avg_severity / 5) * 60
        factors.append(f"symptom severity averaged {avg_severity:.1f}/5")

    vital_flags = _vital_flags(vitals)
    red_flags = [description for _, description in vital_flags]
    factors.extend(red_flags)

    raw_score = severity_score + sum(points for points, _ in vital_flags)
    risk_score = min(100, round(raw_score))
    urgency_level = _urgency_for_score(risk_score)
    care_level = CARE_LEVEL_BY_URGENCY[urgency_level]

    if factors:
        explanation = (
            f"Risk score {risk_score}/100 ({urgency_level}). "
            f"Contributing factors: {'; '.join(factors)}."
        )
    else:
        explanation = "No symptoms or vitals reported yet — risk score defaults to 0."

    return RiskEvaluationResult(
        risk_score=risk_score,
        urgency_level=urgency_level,
        care_level=care_level,
        explanation=explanation,
        red_flags=red_flags,
    )
