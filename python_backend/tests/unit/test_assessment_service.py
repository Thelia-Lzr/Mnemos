import pytest

from app.schemas.assessment import AssessmentBandScore, AssessmentQuestion
from app.services.assessment_questions import BANDS, make_questions
from app.services.assessment_service import summarize


@pytest.mark.parametrize(("scores", "expected_band"), [
    ([("beginner", 3, 4), ("intermediate", 6, 8), ("advanced", 5, 8)], "intermediate"),
    ([("beginner", 3, 3), ("intermediate", 8, 8)], None),
    ([("beginner", 4, 4), ("advanced", 4, 4)], "beginner"),
])
def test_scores_require_sufficient_evidence_at_each_band(scores, expected_band):
    evidence = [AssessmentBandScore(band=band, correct=correct, total=total) for band, correct, total in scores]

    result = summarize(evidence, minimum_questions=4)

    assert result.band == expected_band
    assert result.total == sum(item.total for item in evidence)
    assert result.correct == sum(item.correct for item in evidence)


@pytest.mark.parametrize("language", ["en", "ja", "fr"])
def test_self_test_has_two_disjoint_sets_and_public_questions_hide_answers(language):
    first_set = make_questions(language, 0)
    second_set = make_questions(language, 1)

    assert {item["id"] for item in first_set}.isdisjoint(item["id"] for item in second_set)
    for questions in (first_set, second_set):
        assert [item["band"] for item in questions] == [band for band in BANDS for _ in range(2)]
        for question in questions:
            assert len(set(question["options"])) == 3
            assert question["correctIndex"] in range(3)
            assert set(AssessmentQuestion.model_validate(question).model_dump()) == {"id", "band", "prompt", "options"}
