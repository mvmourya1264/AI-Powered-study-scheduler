from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..pdf_parser import parse_pdf

router = APIRouter(prefix="/syllabus", tags=["syllabus"])


def _get_owned_syllabus(db: Session, syllabus_id: int, user: models.User) -> models.Syllabus:
    syllabus = (
        db.query(models.Syllabus)
        .filter(models.Syllabus.id == syllabus_id, models.Syllabus.user_id == user.id)
        .first()
    )
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus


@router.post("/upload", response_model=schemas.SyllabusOut)
async def upload_syllabus(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contents = await file.read()
    raw_text, parsed_topics = parse_pdf(contents)

    syllabus = models.Syllabus(user_id=user.id, filename=file.filename, raw_text=raw_text)
    db.add(syllabus)
    db.flush()  # get syllabus.id before adding topics

    for pt in parsed_topics:
        db.add(
            models.Topic(
                syllabus_id=syllabus.id,
                title=pt["title"],
                priority=pt["priority"],
                weight=pt["weight"],
                marks=pt["marks"],
                order_index=pt["order_index"],
            )
        )

    db.commit()
    db.refresh(syllabus)
    return syllabus


@router.get("/", response_model=List[schemas.SyllabusOut])
def list_syllabi(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Syllabus).filter(models.Syllabus.user_id == user.id).all()


@router.get("/{syllabus_id}", response_model=schemas.SyllabusOut)
def get_syllabus(
    syllabus_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    return _get_owned_syllabus(db, syllabus_id, user)


@router.delete("/{syllabus_id}", status_code=204)
def delete_syllabus(
    syllabus_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    syllabus = _get_owned_syllabus(db, syllabus_id, user)
    db.delete(syllabus)
    db.commit()


@router.post("/{syllabus_id}/topics", response_model=schemas.TopicOut)
def add_topic(
    syllabus_id: int,
    topic_in: schemas.TopicCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    syllabus = _get_owned_syllabus(db, syllabus_id, user)
    topic = models.Topic(syllabus_id=syllabus.id, **topic_in.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.patch("/topics/{topic_id}", response_model=schemas.TopicOut)
def update_topic(
    topic_id: int,
    topic_in: schemas.TopicUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    topic = (
        db.query(models.Topic)
        .join(models.Syllabus)
        .filter(models.Topic.id == topic_id, models.Syllabus.user_id == user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    for field, value in topic_in.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)

    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}", status_code=204)
def delete_topic(
    topic_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    topic = (
        db.query(models.Topic)
        .join(models.Syllabus)
        .filter(models.Topic.id == topic_id, models.Syllabus.user_id == user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()
