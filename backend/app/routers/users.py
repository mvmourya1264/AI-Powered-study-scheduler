from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])


def _completion_pct(completed: int, total: int) -> float:
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
    rows = (
        db.query(models.StudyPlan, models.Syllabus.filename)
        .join(models.Syllabus, models.Syllabus.id == models.StudyPlan.syllabus_id)
        .options(joinedload(models.StudyPlan.sessions))
        .filter(models.StudyPlan.user_id == user.id)
        .order_by(models.StudyPlan.created_at.desc())
        .all()
    )

    plan_stats = []
    total_sessions = 0
    completed_sessions = 0
    total_hours = 0.0
    completed_hours = 0.0

    for plan, filename in rows:
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
            schemas.PlanProgressOut(
                plan_id=plan.id,
                syllabus_id=plan.syllabus_id,
                syllabus_filename=filename,
                total_days=plan.total_days,
                total_sessions=plan_total,
                completed_sessions=plan_completed,
                total_hours=round(plan_hours, 2),
                completed_hours=round(plan_completed_hours, 2),
                completion_pct=_completion_pct(plan_completed, plan_total),
            )
        )

    return schemas.ProgressOut(
        total_plans=len(rows),
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        total_hours=round(total_hours, 2),
        completed_hours=round(completed_hours, 2),
        completion_pct=_completion_pct(completed_sessions, total_sessions),
        plans=plan_stats,
    )
