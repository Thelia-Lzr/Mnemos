"""生成可复核的本地评估结果。"""

from datetime import datetime, timezone
from hashlib import sha256
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import AssessmentRecord
from app.models.practice import PracticeGroup, PracticeResult
from app.models.user import User
from app.schemas.assessment import (
    AssessmentAnswer,
    AssessmentBandScore,
    AssessmentLanguage,
    AssessmentPracticeEvidence,
    AssessmentQuestion,
    AssessmentReport,
    AssessmentScores,
    AssessmentSession,
)
from app.services.assessment_questions import BANDS, make_questions

RECENT_GROUPS = 12
PASSING_PERCENT = 75


def summarize(scores: list[AssessmentBandScore], minimum_questions: int) -> AssessmentScores:
    bands = [
        AssessmentBandScore(
            band=band,
            correct=sum(score.correct for score in scores if score.band == band),
            total=sum(score.total for score in scores if score.band == band),
        )
        for band in BANDS
    ]
    band_reached = None
    for item in bands:
        if item.total < minimum_questions or item.correct * 100 < item.total * PASSING_PERCENT:
            break
        band_reached = item.band
    return AssessmentScores(
        band=band_reached,
        correct=sum(band.correct for band in bands),
        total=sum(band.total for band in bands),
        minimumQuestions=minimum_questions,
        passingPercent=PASSING_PERCENT,
        bands=bands,
    )


def report_view(record: AssessmentRecord) -> AssessmentReport:
    return AssessmentReport(
        id=record.id, language=record.language, source=record.source,
        completedAt=record.completed_at, **record.report,
    )


def session_view(record: AssessmentRecord) -> AssessmentSession:
    return AssessmentSession(
        id=record.id,
        language=record.language,
        questions=[] if record.report else [AssessmentQuestion.model_validate(item) for item in record.questions],
        report=report_view(record) if record.report else None,
    )


async def assess_practice(db: AsyncSession, user_id: UUID, language: AssessmentLanguage) -> AssessmentReport:
    # Only the newest completed attempt per group represents that group.
    latest = (
        select(
            PracticeResult.id.label("result_id"),
            PracticeResult.correct_answers,
            PracticeResult.total_questions,
            PracticeResult.completed_at,
            PracticeGroup.title,
            PracticeGroup.difficulty,
            func.row_number().over(
                partition_by=PracticeGroup.id,
                order_by=(PracticeResult.completed_at.desc(), PracticeResult.id.desc()),
            ).label("attempt_rank"),
        )
        .join(PracticeGroup, PracticeResult.practice_group_id == PracticeGroup.id)
        .where(
            PracticeResult.user_id == user_id,
            PracticeGroup.user_id == user_id,
            PracticeGroup.language == language,
            PracticeGroup.difficulty.in_(BANDS),
            PracticeResult.completed_at.is_not(None),
            PracticeResult.total_questions > 0,
            PracticeResult.correct_answers >= 0,
            PracticeResult.correct_answers <= PracticeResult.total_questions,
        )
        .subquery()
    )
    rows = (await db.execute(
        select(latest).where(latest.c.attempt_rank == 1)
        .order_by(latest.c.completed_at.desc(), latest.c.result_id.desc()).limit(RECENT_GROUPS)
    )).all()
    if not rows:
        raise HTTPException(status_code=409, detail="该语言还没有已完成的练习。可以先做本地自测。")

    evidence_key = sha256("|".join(str(row.result_id) for row in rows).encode()).hexdigest()
    await db.execute(select(User.id).where(User.id == user_id).with_for_update())
    existing = await db.scalar(select(AssessmentRecord).where(
        AssessmentRecord.user_id == user_id, AssessmentRecord.language == language,
        AssessmentRecord.evidence_key == evidence_key,
    ))
    if existing:
        return report_view(existing)

    evidence = [
        AssessmentPracticeEvidence(
            resultId=row.result_id, title=row.title, completedAt=row.completed_at,
            band=row.difficulty, correct=row.correct_answers, total=row.total_questions,
        )
        for row in rows
    ]
    scores = summarize(evidence, minimum_questions=4)
    scores.practice = evidence
    record = AssessmentRecord(
        user_id=user_id, language=language, source="practice",
        evidence_key=evidence_key, report=scores.model_dump(mode="json"),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(record)
    await db.flush()
    view = report_view(record)
    await db.commit()
    return view


async def begin_self_test(db: AsyncSession, user_id: UUID, language: AssessmentLanguage) -> AssessmentSession:
    await db.execute(select(User.id).where(User.id == user_id).with_for_update())
    criteria = (
        AssessmentRecord.user_id == user_id,
        AssessmentRecord.language == language,
        AssessmentRecord.source == "self_test",
    )
    record = await db.scalar(
        select(AssessmentRecord).where(*criteria, AssessmentRecord.completed_at.is_(None))
    )
    if record:
        return session_view(record)

    count = await db.scalar(select(func.count(AssessmentRecord.id)).where(*criteria))
    record = AssessmentRecord(
        user_id=user_id, language=language, source="self_test", questions=make_questions(language, count % 2),
    )
    db.add(record)
    await db.flush()
    view = session_view(record)
    await db.commit()
    return view


async def find_self_test(
    db: AsyncSession, user_id: UUID, test_id: UUID, *, lock: bool = False,
) -> AssessmentRecord:
    query = select(AssessmentRecord).where(
        AssessmentRecord.id == test_id,
        AssessmentRecord.user_id == user_id,
        AssessmentRecord.source == "self_test",
    )
    record = await db.scalar(query.with_for_update() if lock else query)
    if record is None:
        raise HTTPException(status_code=404, detail="未找到这次自测。")
    return record


async def submit_self_test(
    db: AsyncSession, user_id: UUID, test_id: UUID, answers: dict[str, int],
) -> AssessmentReport:
    record = await find_self_test(db, user_id, test_id, lock=True)
    if record.report:
        return report_view(record)

    questions = record.questions
    if answers.keys() != {question["id"] for question in questions} or any(
        not 0 <= answers[question["id"]] < len(question["options"]) for question in questions
    ):
        raise HTTPException(status_code=422, detail="请为每道题选择一个有效答案。")

    reviewed = [AssessmentAnswer(**question, selectedIndex=answers[question["id"]]) for question in questions]
    scores = summarize([
        AssessmentBandScore(
            band=answer.band, correct=int(answer.selectedIndex == answer.correctIndex), total=1,
        )
        for answer in reviewed
    ], minimum_questions=2)
    scores.answers = reviewed
    record.report = scores.model_dump(mode="json")
    record.completed_at = datetime.now(timezone.utc)
    view = report_view(record)
    await db.commit()
    return view
