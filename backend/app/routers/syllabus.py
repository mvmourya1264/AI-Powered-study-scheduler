from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..gemini_extractor import (
    GeminiExtractionError,
    GeminiNotConfiguredError,
    extract_topics_with_gemini,
)
from ..pdf_parser import ParsedTopic, extract_text, parse_pdf, parse_syllabus_text

router = APIRouter(prefix="/syllabus", tags=["syllabus"])

ALLOWED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}

MIME_BY_SUFFIX = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _file_suffix(filename: str) -> str:
    dot = filename.rfind(".")
    if dot == -1:
        return ""
    return filename[dot:].lower()


def _get_owned_syllabus(db: Session, syllabus_id: int, user: models.User) -> models.Syllabus:
    syllabus = (
        db.query(models.Syllabus)
        .filter(models.Syllabus.id == syllabus_id, models.Syllabus.user_id == user.id)
        .first()
    )
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus


def _extract_topics_from_upload(
    contents: bytes, mime_type: str, *, is_pdf: bool
) -> tuple[str, list[ParsedTopic]]:
    raw_text = ""
    if is_pdf:
        try:
            raw_text = extract_text(contents)
        except Exception:
            raw_text = ""

    try:
        topics = extract_topics_with_gemini(contents, mime_type)
        return raw_text, topics
    except GeminiNotConfiguredError:
        if not is_pdf:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Image syllabus extraction requires the Gemini API. "
                    "Set GEMINI_API_KEY in your environment and restart the backend."
                ),
            ) from None
    except GeminiExtractionError as exc:
        if not is_pdf:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Could not extract topics from the image: {exc}. "
                    "Ensure GEMINI_API_KEY is valid and the photo is a readable syllabus."
                ),
            ) from None

    if is_pdf:
        if raw_text:
            return raw_text, parse_syllabus_text(raw_text)
        try:
            fallback_raw, fallback_topics = parse_pdf(contents)
            return fallback_raw, fallback_topics
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Could not read the PDF: {exc}",
            ) from None

    raise HTTPException(status_code=502, detail="Topic extraction failed.")


@router.post("/upload", response_model=schemas.SyllabusOut)
async def upload_syllabus(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    filename = file.filename or "upload"
    suffix = _file_suffix(filename)
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, JPEG, PNG, and WEBP.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    mime_type = MIME_BY_SUFFIX[suffix]
    is_pdf = suffix == ".pdf"

    raw_text, parsed_topics = _extract_topics_from_upload(contents, mime_type, is_pdf=is_pdf)

    syllabus = models.Syllabus(user_id=user.id, filename=filename, raw_text=raw_text or None)
    db.add(syllabus)
    db.flush()

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
    return (
        db.query(models.Syllabus)
        .options(joinedload(models.Syllabus.topics))
        .filter(models.Syllabus.user_id == user.id)
        .all()
    )


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
    for plan in list(syllabus.plans):
        db.delete(plan)
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
