"""Hospital Intelligence Engine — weighted, explainable hospital ranking.

Rule-based MVP implementation of the plan's documented scoring formula:

    0.30*specialty + 0.20*eta + 0.15*beds + 0.10*doctors
    + 0.10*queue + 0.10*reliability + 0.05*insurance

Two factors are simplified versions of what the full plan eventually wants:
"doctor availability" uses aggregate counts (no Doctor entity exists yet —
that's a later phase) and ETA is haversine distance at an assumed urban
speed rather than a real routing API (no Maps key configured; the plan
explicitly allows a simulated ETA for the MVP).
"""

import math

from pydantic import BaseModel

WEIGHTS = {
    "specialty": 0.30,
    "eta": 0.20,
    "beds": 0.15,
    "doctors": 0.10,
    "queue": 0.10,
    "reliability": 0.10,
    "insurance": 0.05,
}

AVG_URBAN_SPEED_KMH = 30.0
AVG_CONSULT_MINUTES = 8.0


class HospitalCandidate(BaseModel):
    hospital_id: str
    name: str
    latitude: float
    longitude: float
    specialties: list[str] = []
    available_beds: int = 0
    total_beds: int = 0
    available_doctors: int = 0
    total_doctors: int = 0
    queue_load: int = 0
    reliability_score: float = 0.0
    accepted_insurance_providers: list[str] = []


class RankHospitalsRequest(BaseModel):
    patient_latitude: float
    patient_longitude: float
    required_specialization: str | None = None
    insurance_providers: list[str] = []
    max_eta_minutes: float = 60.0
    max_queue: int = 30
    candidates: list[HospitalCandidate]


class HospitalScoreBreakdown(BaseModel):
    specialty: float
    eta: float
    beds: float
    doctors: float
    queue: float
    reliability: float
    insurance: float


class HospitalRankResult(BaseModel):
    hospital_id: str
    name: str
    score: float
    eta_minutes: int
    wait_time_minutes: int
    breakdown: HospitalScoreBreakdown
    explanation: str


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _ratio(available: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return max(0.0, min(1.0, available / total))


def _inverse_ratio(value: float, cap: float) -> float:
    if cap <= 0:
        return 0.0
    return max(0.0, min(1.0, 1 - (value / cap)))


def _specialty_match(specialties: list[str], required: str | None) -> float:
    if required is None:
        return 1.0
    return 1.0 if required in specialties else 0.0


def _insurance_match(accepted: list[str], patient_providers: list[str]) -> float:
    if not accepted:
        return 1.0  # empty list is this codebase's "accepts all" convention
    if not patient_providers:
        return 1.0  # nothing on file to mismatch against
    return 1.0 if set(accepted) & set(patient_providers) else 0.0


def rank_hospitals(request: RankHospitalsRequest) -> list[HospitalRankResult]:
    results: list[HospitalRankResult] = []

    for c in request.candidates:
        distance_km = _haversine_km(
            request.patient_latitude, request.patient_longitude, c.latitude, c.longitude
        )
        eta_minutes = round((distance_km / AVG_URBAN_SPEED_KMH) * 60)
        wait_time_minutes = round(c.queue_load * AVG_CONSULT_MINUTES)

        breakdown = HospitalScoreBreakdown(
            specialty=_specialty_match(c.specialties, request.required_specialization),
            eta=_inverse_ratio(eta_minutes, request.max_eta_minutes),
            beds=_ratio(c.available_beds, c.total_beds),
            doctors=_ratio(c.available_doctors, c.total_doctors),
            queue=_inverse_ratio(c.queue_load, request.max_queue),
            reliability=max(0.0, min(1.0, c.reliability_score)),
            insurance=_insurance_match(c.accepted_insurance_providers, request.insurance_providers),
        )

        score = 100 * (
            WEIGHTS["specialty"] * breakdown.specialty
            + WEIGHTS["eta"] * breakdown.eta
            + WEIGHTS["beds"] * breakdown.beds
            + WEIGHTS["doctors"] * breakdown.doctors
            + WEIGHTS["queue"] * breakdown.queue
            + WEIGHTS["reliability"] * breakdown.reliability
            + WEIGHTS["insurance"] * breakdown.insurance
        )

        factors = [
            f"specialty match {breakdown.specialty:.0%}",
            f"~{eta_minutes} min away",
            f"{c.available_beds}/{c.total_beds} beds free",
            f"{c.available_doctors}/{c.total_doctors} doctors available",
            f"queue of {c.queue_load} (~{wait_time_minutes} min wait)",
            f"reliability {breakdown.reliability:.0%}",
            f"insurance match {breakdown.insurance:.0%}",
        ]
        explanation = f"Score {round(score)}/100 — " + "; ".join(factors) + "."

        results.append(
            HospitalRankResult(
                hospital_id=c.hospital_id,
                name=c.name,
                score=round(score, 1),
                eta_minutes=eta_minutes,
                wait_time_minutes=wait_time_minutes,
                breakdown=breakdown,
                explanation=explanation,
            )
        )

    results.sort(key=lambda r: r.score, reverse=True)
    return results
