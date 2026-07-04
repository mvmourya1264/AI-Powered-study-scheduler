from datetime import datetime, timedelta, date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])


def _percent_complete(completed: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(completed / total * 100, 1)


@router.get("/me", response_model=schemas.UserOut)
def get_profile(user: models.User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=schemas.UserOut)
def update_profile(
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    updates = user_in.model_dump(exclude_unset=True)
    if not updates:
        return user

    if "email" in updates and updates["email"] != user.email:
        existing = (
            db.query(models.User)
            .filter(models.User.email == updates["email"], models.User.id != user.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")

    for field, value in updates.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.get("/me/progress", response_model=schemas.ProgressOut)
def get_progress(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    plans = (
        db.query(models.StudyPlan)
        .options(
            joinedload(models.StudyPlan.sessions),
            joinedload(models.StudyPlan.syllabus),
        )
        .filter(models.StudyPlan.user_id == user.id)
        .order_by(models.StudyPlan.created_at.desc())
        .all()
    )

    plan_stats = []
    total_sessions = 0
    completed_sessions = 0
    total_hours = 0.0
    completed_hours = 0.0

    for plan in plans:
        sessions = plan.sessions
        plan_total = len(sessions)
        plan_completed = sum(1 for s in sessions if s.completed)
        plan_hours = sum(s.allocated_hours for s in sessions)
        plan_completed_hours = sum(s.allocated_hours for s in sessions if s.completed)

        total_sessions += plan_total
        completed_sessions += plan_completed
        total_hours += plan_hours
        completed_hours += plan_completed_hours

        plan_stats.append(
            schemas.PlanProgress(
                plan_id=plan.id,
                syllabus_filename=plan.syllabus.filename,
                total_days=plan.total_days,
                total_sessions=plan_total,
                completed_sessions=plan_completed,
                total_hours=round(plan_hours, 2),
                completed_hours=round(plan_completed_hours, 2),
                percent_complete=_percent_complete(plan_completed, plan_total),
            )
        )

    return schemas.ProgressOut(
        total_plans=len(plans),
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        total_hours=round(total_hours, 2),
        completed_hours=round(completed_hours, 2),
        percent_complete=_percent_complete(completed_sessions, total_sessions),
        plans=plan_stats,
    )


@router.get("/me/calendar", response_model=List[schemas.CalendarDay])
def get_calendar(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    sessions = (
        db.query(models.ScheduleSession)
        .join(models.StudyPlan, models.ScheduleSession.plan_id == models.StudyPlan.id)
        .options(
            joinedload(models.ScheduleSession.topic),
            joinedload(models.ScheduleSession.plan).joinedload(models.StudyPlan.syllabus),
        )
        .filter(
            models.StudyPlan.user_id == user.id,
            models.ScheduleSession.date.isnot(None),
        )
        .order_by(models.ScheduleSession.date)
        .all()
    )

    by_date: dict[str, list[schemas.CalendarSession]] = {}
    for session in sessions:
        day_key = session.date.date().isoformat()
        by_date.setdefault(day_key, []).append(
            schemas.CalendarSession(
                session_id=session.id,
                plan_id=session.plan_id,
                syllabus_filename=session.plan.syllabus.filename,
                topic_title=session.topic.title,
                priority=session.topic.priority,
                allocated_hours=session.allocated_hours,
                completed=session.completed,
            )
        )

    return [schemas.CalendarDay(date=day, sessions=by_date[day]) for day in sorted(by_date.keys())]


@router.get("/me/activity", response_model=schemas.ActivityOut)
def get_activity(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    now = datetime.utcnow()
    one_year_ago = now - timedelta(days=365)
    since = one_year_ago
    if user.created_at and user.created_at > one_year_ago:
        since = user.created_at

    rows = (
        db.query(
            func.date(models.ScheduleSession.date).label("day"),
            func.count(models.ScheduleSession.id).label("sessions_completed"),
            func.sum(models.ScheduleSession.allocated_hours).label("hours_completed"),
        )
        .join(models.StudyPlan, models.ScheduleSession.plan_id == models.StudyPlan.id)
        .filter(
            models.StudyPlan.user_id == user.id,
            models.ScheduleSession.completed.is_(True),
            models.ScheduleSession.date.isnot(None),
            models.ScheduleSession.date >= since,
        )
        .group_by(func.date(models.ScheduleSession.date))
        .order_by(func.date(models.ScheduleSession.date))
        .all()
    )

    days = [
        schemas.ActivityDay(
            date=str(row.day),
            sessions_completed=int(row.sessions_completed),
            hours_completed=round(float(row.hours_completed or 0), 2),
        )
        for row in rows
    ]

    active_dates = {d.date for d in days if d.sessions_completed > 0}
    total_active_days = len(active_dates)

    streak = 0
    check = date.today()
    if check.isoformat() not in active_dates:
        check = check - timedelta(days=1)
    while check.isoformat() in active_dates:
        streak += 1
        check = check - timedelta(days=1)

    return schemas.ActivityOut(
        days=days,
        current_streak=streak,
        total_active_days=total_active_days,
    )


@router.delete("/me", status_code=204)
def delete_account(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    for plan in list(user.plans):
        db.delete(plan)
    for syllabus in list(user.syllabi):
        db.delete(syllabus)
    db.delete(user)
    db.commit()
