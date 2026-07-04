"""
Extract syllabus topics from PDFs and images using Google's Gemini API.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from google import genai
from google.genai import types

from .models import PriorityLevel
from .pdf_parser import ParsedTopic, _dedupe_topics, _priority_to_weight

GEMINI_MODEL = "gemini-2.5-flash"

EXTRACTION_PROMPT = """You are extracting study syllabus topics from a document or photo of a syllabus.

Read all syllabus content from the attached file. Identify each distinct topic, chapter, or unit that a student would need to study.

For each topic determine:
- title: clear topic name (string)
- priority: exactly one of "high", "medium", or "low" based on explicit labels (High Priority, important, optional, etc.) or marks/weightage if stated; use "medium" when unclear
- marks: numeric marks/weightage/points if explicitly stated, otherwise null

Return ONLY a JSON array. No markdown, no explanation, no code fences. Each object must have keys: title, priority, marks.

Example:
[
  { "title": "Thermodynamics", "priority": "high", "marks": 15 },
  { "title": "Optics", "priority": "low", "marks": null }
]
"""


class GeminiExtractionError(Exception):
    """Gemini topic extraction failed; PDF uploads may fall back to the heuristic parser."""


class GeminiNotConfiguredError(GeminiExtractionError):
    """GEMINI_API_KEY is not set."""


def _require_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        raise GeminiNotConfiguredError(
            "GEMINI_API_KEY environment variable is not set."
        )
    return api_key.strip()


def _strip_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_priority(value: Any) -> PriorityLevel:
    if not isinstance(value, str):
        raise ValueError(f"priority must be a string, got {type(value).__name__}")
    normalized = value.strip().lower()
    mapping = {
        "high": PriorityLevel.HIGH,
        "medium": PriorityLevel.MEDIUM,
        "low": PriorityLevel.LOW,
    }
    if normalized not in mapping:
        raise ValueError(f"invalid priority: {value!r}")
    return mapping[normalized]


def _parse_marks(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError("marks must be a number or null")
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return float(stripped)
        except ValueError as exc:
            raise ValueError(f"invalid marks: {value!r}") from exc
    raise ValueError(f"invalid marks type: {type(value).__name__}")


def _parse_gemini_json(text: str) -> list[dict[str, Any]]:
    cleaned = _strip_markdown_fences(text)
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise GeminiExtractionError(f"Gemini response was not valid JSON: {exc}") from exc

    if not isinstance(payload, list):
        raise GeminiExtractionError("Gemini response must be a JSON array of topics.")

    items: list[dict[str, Any]] = []
    for index, item in enumerate(payload):
        if not isinstance(item, dict):
            raise GeminiExtractionError(f"Topic at index {index} is not an object.")
        for key in ("title", "priority", "marks"):
            if key not in item:
                raise GeminiExtractionError(f"Topic at index {index} is missing key {key!r}.")
        items.append(item)
    return items


def _items_to_parsed_topics(items: list[dict[str, Any]]) -> list[ParsedTopic]:
    topics: list[ParsedTopic] = []
    for order_index, item in enumerate(items):
        title = item["title"]
        if not isinstance(title, str) or not title.strip():
            raise GeminiExtractionError(f"Topic at index {order_index} has an invalid title.")
        priority = _parse_priority(item["priority"])
        marks = _parse_marks(item["marks"])
        topics.append(
            ParsedTopic(
                title=title.strip(),
                priority=priority,
                weight=_priority_to_weight(priority, marks),
                marks=marks,
                order_index=order_index,
            )
        )
    return _dedupe_topics(topics)


def extract_topics_with_gemini(file_bytes: bytes, mime_type: str) -> list[ParsedTopic]:
    """
    Send a PDF or image to Gemini and return parsed syllabus topics.
    Raises GeminiNotConfiguredError if GEMINI_API_KEY is missing.
    Raises GeminiExtractionError on API or parsing failures.
    """
    api_key = _require_api_key()
    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                EXTRACTION_PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
    except Exception as exc:
        raise GeminiExtractionError(f"Gemini API request failed: {exc}") from exc

    text = (response.text or "").strip()
    if not text:
        raise GeminiExtractionError("Gemini returned an empty response.")

    try:
        items = _parse_gemini_json(text)
    except GeminiExtractionError:
        raise
    except ValueError as exc:
        raise GeminiExtractionError(f"Invalid topic data in Gemini response: {exc}") from exc

    if not items:
        raise GeminiExtractionError("Gemini returned no topics.")

    try:
        return _items_to_parsed_topics(items)
    except GeminiExtractionError:
        raise
    except ValueError as exc:
        raise GeminiExtractionError(f"Invalid topic data in Gemini response: {exc}") from exc
