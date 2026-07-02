from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..scheduler_algo import SchedTopic, generate_schedule

router = APIRouter(prefix="/plan", tags=["plan"])


@router.post("/generate", response_model=schemas.PlanOut)
def generate_plan(
    req: schemas.PlanGenerateRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    syllabus = (
        db.query(models.Syllabus)
        .filter(models.Syllabus.id == req.syllabus_id, models.Syllabus.user_id == user.id)
        .first()
    )
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    if not syllabus.topics:
        raise HTTPException(status_code=400, detail="Syllabus has no topics to schedule")
    if req.total_days <= 0 or req.hours_per_day <= 0:
        raise HTTPException(status_code=400, detail="total_days and hours_per_day must be positive")

    sched_topics = [
        SchedTopic(id=t.id, title=t.title, weight=t.weight, estimated_hours=t.estimated_hours)
        for t in syllabus.topics
    ]

    allocations = generate_schedule(
        sched_topics, req.total_days, req.hours_per_day, req.start_date
    )

    plan = models.StudyPlan(
        user_id=user.id,
        syllabus_id=syllabus.id,
        total_days=req.total_days,
        hours_per_day=req.hours_per_day,
        start_date=req.start_date,
    )
    db.add(plan)
    db.flush()

    for a in allocations:
        db.add(
            models.ScheduleSession(
                plan_id=plan.id,
                topic_id=a["topic_id"],
                day_number=a["day_number"],
                date=a["date"],
                allocated_hours=a["allocated_hours"],
            )
        )

    db.commit()
    db.refresh(plan)
    return plan


@router.get("/", response_model=List[schemas.PlanOut])
def list_plans(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.StudyPlan)
        .options(joinedload(models.StudyPlan.sessions).joinedload(models.ScheduleSession.topic))
        .filter(models.StudyPlan.user_id == user.id)
        .all()
    )


@router.get("/{plan_id}", response_model=schemas.PlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    plan = (
        db.query(models.StudyPlan)
        .options(joinedload(models.StudyPlan.sessions).joinedload(models.ScheduleSession.topic))
        .filter(models.StudyPlan.id == plan_id, models.StudyPlan.user_id == user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.delete("/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    plan = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.id == plan_id, models.StudyPlan.user_id == user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()


@router.patch("/sessions/{session_id}", response_model=schemas.SessionOut)
def update_session(
    session_id: int,
    session_in: schemas.SessionUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    session = (
        db.query(models.ScheduleSession)
        .join(models.StudyPlan)
        .filter(models.ScheduleSession.id == session_id, models.StudyPlan.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.completed = session_in.completed
    db.commit()
    db.refresh(session)
    return session
