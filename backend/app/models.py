import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from .database import Base


class PriorityLevel(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    syllabi = relationship("Syllabus", back_populates="owner", cascade="all, delete-orphan")
    plans = relationship("StudyPlan", back_populates="owner", cascade="all, delete-orphan")


class Syllabus(Base):
    __tablename__ = "syllabi"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    raw_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="syllabi")
    topics = relationship("Topic", back_populates="syllabus", cascade="all, delete-orphan")
    plans = relationship("StudyPlan", back_populates="syllabus", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=False)
    title = Column(String, nullable=False)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM)
    weight = Column(Float, default=1.0)          # numeric weight derived from priority/marks, used by algorithm
    marks = Column(Float, nullable=True)          # optional, if syllabus gives marks/weightage
    estimated_hours = Column(Float, nullable=True)  # optional user override of how long topic needs
    order_index = Column(Integer, default=0)      # order as it appeared in the syllabus

    syllabus = relationship("Syllabus", back_populates="topics")
    sessions = relationship("ScheduleSession", back_populates="topic")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=False)
    total_days = Column(Integer, nullable=False)
    hours_per_day = Column(Float, nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="plans")
    syllabus = relationship("Syllabus", back_populates="plans")
    sessions = relationship("ScheduleSession", back_populates="plan", cascade="all, delete-orphan")


class ScheduleSession(Base):
    __tablename__ = "schedule_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    day_number = Column(Integer, nullable=False)     # 1-indexed day within the plan
    date = Column(DateTime, nullable=True)            # actual calendar date, derived from start_date + day_number
    allocated_hours = Column(Float, nullable=False)
    completed = Column(Boolean, default=False)

    plan = relationship("StudyPlan", back_populates="sessions")
    topic = relationship("Topic", back_populates="sessions")
