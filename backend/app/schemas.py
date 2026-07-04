from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from .models import PriorityLevel


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    daily_start_time: str = "09:00"
    created_at: datetime

    @field_validator("daily_start_time", mode="before")
    @classmethod
    def coerce_daily_start_time(cls, value):
        return value or "09:00"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    daily_start_time: Optional[str] = None

    @field_validator("daily_start_time")
    @classmethod
    def validate_daily_start_time(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        parts = value.strip().split(":")
        if len(parts) != 2:
            raise ValueError("daily_start_time must be HH:MM")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("daily_start_time must be a valid time")
        return f"{hour:02d}:{minute:02d}"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Topics ----------
class TopicBase(BaseModel):
    title: str
    priority: PriorityLevel = PriorityLevel.MEDIUM
    weight: float = 1.0
    marks: Optional[float] = None
    estimated_hours: Optional[float] = None
    order_index: int = 0


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[PriorityLevel] = None
    weight: Optional[float] = None
    marks: Optional[float] = None
    estimated_hours: Optional[float] = None


class TopicOut(TopicBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    syllabus_id: int


# ---------- Syllabus ----------
class SyllabusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    uploaded_at: datetime
    topics: List[TopicOut] = []


# ---------- Study Plan / Schedule ----------
class PlanGenerateRequest(BaseModel):
    syllabus_id: int
    total_days: int
    hours_per_day: float
    start_date: Optional[datetime] = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic_id: int
    day_number: int
    date: Optional[datetime] = None
    allocated_hours: float
    completed: bool
    topic: TopicOut


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    syllabus_id: int
    total_days: int
    hours_per_day: float
    start_date: Optional[datetime] = None
    created_at: datetime
    sessions: List[SessionOut] = []


class SessionUpdate(BaseModel):
    completed: bool


# ---------- User progress ----------
class PlanProgress(BaseModel):
    plan_id: int
    syllabus_filename: str
    total_days: int
    total_sessions: int
    completed_sessions: int
    total_hours: float
    completed_hours: float
    percent_complete: float


class ProgressOut(BaseModel):
    total_plans: int
    total_sessions: int
    completed_sessions: int
    total_hours: float
    completed_hours: float
    percent_complete: float
    plans: List[PlanProgress] = []


class ActivityDay(BaseModel):
    date: str
    sessions_completed: int
    hours_completed: float


class ActivityOut(BaseModel):
    days: List[ActivityDay] = []
    current_streak: int
    total_active_days: int


class CalendarSession(BaseModel):
    session_id: int
    plan_id: int
    syllabus_filename: str
    topic_title: str
    priority: PriorityLevel
    allocated_hours: float
    completed: bool


class CalendarDay(BaseModel):
    date: str
    sessions: List[CalendarSession] = []


# ---------- Dashboard ----------
class DashboardSession(BaseModel):
    session_id: int
    topic_title: str
    priority: PriorityLevel
    start_time: str
    end_time: str
    completed: bool
    plan_id: int


class DashboardToday(BaseModel):
    date: str
    total_hours_scheduled: float
    total_hours_completed: float
    sessions_completed: int
    sessions_total: int
    sessions: List[DashboardSession] = []


class WeeklyDayHours(BaseModel):
    date: str
    hours_completed: float


class SubjectProgress(BaseModel):
    plan_id: int
    syllabus_filename: str
    percent_complete: float
    hours_completed: float
    hours_total: float
    total_sessions: int
    completed_sessions: int


class DashboardOut(BaseModel):
    greeting_name: str
    streak_days: int
    today: DashboardToday
    daily_goal_hours: float
    weekly_study_hours: List[WeeklyDayHours]
    subject_progress: List[SubjectProgress] = []
