from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
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
    created_at: datetime


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
