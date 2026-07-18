from fastapi import FastAPI

from .risk_scoring import RiskEvaluationRequest, RiskEvaluationResult, evaluate_risk
from .hospital_scoring import RankHospitalsRequest, HospitalRankResult, rank_hospitals

app = FastAPI(title="MediLink AI Service")


@app.get("/health")
def health() -> dict:
    return {"status": "OK", "service": "medilink-ai-service"}


@app.post("/risk/evaluate")
def risk_evaluate(request: RiskEvaluationRequest) -> RiskEvaluationResult:
    return evaluate_risk(request.symptoms, request.vitals)


@app.post("/hospital-intelligence/rank")
def hospital_rank(request: RankHospitalsRequest) -> list[HospitalRankResult]:
    return rank_hospitals(request)
