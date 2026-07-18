from fastapi.testclient import TestClient

from app.main import app
from app.hospital_scoring import HospitalCandidate, RankHospitalsRequest, rank_hospitals

client = TestClient(app)


def make_candidate(**overrides) -> HospitalCandidate:
    base = dict(
        hospital_id="h1",
        name="Test Hospital",
        latitude=28.61,
        longitude=77.21,
        specialties=["Cardiology"],
        available_beds=50,
        total_beds=100,
        available_doctors=10,
        total_doctors=20,
        queue_load=5,
        reliability_score=0.9,
        accepted_insurance_providers=[],
    )
    base.update(overrides)
    return HospitalCandidate(**base)


def test_closer_hospital_ranks_higher_all_else_equal():
    near = make_candidate(hospital_id="near", latitude=28.611, longitude=77.211)
    far = make_candidate(hospital_id="far", latitude=29.5, longitude=78.5)

    results = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            candidates=[far, near],
        )
    )

    assert results[0].hospital_id == "near"
    assert results[0].score > results[1].score


def test_required_specialization_not_matched_scores_zero_on_that_factor():
    matching = make_candidate(hospital_id="match", specialties=["Cardiology"])
    non_matching = make_candidate(hospital_id="no-match", specialties=["Pediatrics"])

    results = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            required_specialization="Cardiology",
            candidates=[matching, non_matching],
        )
    )

    by_id = {r.hospital_id: r for r in results}
    assert by_id["match"].breakdown.specialty == 1.0
    assert by_id["no-match"].breakdown.specialty == 0.0
    assert by_id["match"].score > by_id["no-match"].score


def test_no_required_specialization_gives_full_credit():
    result = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            candidates=[make_candidate(specialties=[])],
        )
    )[0]
    assert result.breakdown.specialty == 1.0


def test_empty_accepted_insurance_means_accepts_all():
    result = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            insurance_providers=["SomeInsurer"],
            candidates=[make_candidate(accepted_insurance_providers=[])],
        )
    )[0]
    assert result.breakdown.insurance == 1.0


def test_insurance_mismatch_scores_zero():
    result = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            insurance_providers=["OtherInsurer"],
            candidates=[make_candidate(accepted_insurance_providers=["HealthCo"])],
        )
    )[0]
    assert result.breakdown.insurance == 0.0


def test_full_beds_and_doctors_score_one():
    result = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            candidates=[
                make_candidate(available_beds=100, total_beds=100, available_doctors=20, total_doctors=20)
            ],
        )
    )[0]
    assert result.breakdown.beds == 1.0
    assert result.breakdown.doctors == 1.0


def test_wait_time_scales_with_queue_load():
    result = rank_hospitals(
        RankHospitalsRequest(
            patient_latitude=28.61,
            patient_longitude=77.21,
            candidates=[make_candidate(queue_load=10)],
        )
    )[0]
    assert result.wait_time_minutes == 80  # 10 * 8 min/consult


def test_rank_endpoint_returns_sorted_results():
    response = client.post(
        "/hospital-intelligence/rank",
        json={
            "patient_latitude": 28.61,
            "patient_longitude": 77.21,
            "candidates": [
                {
                    "hospital_id": "a",
                    "name": "A",
                    "latitude": 28.61,
                    "longitude": 77.21,
                    "reliability_score": 0.5,
                },
                {
                    "hospital_id": "b",
                    "name": "B",
                    "latitude": 28.61,
                    "longitude": 77.21,
                    "reliability_score": 0.95,
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["hospital_id"] == "b"
