"""Unit tests for Gemini response parsing (no live API calls)."""
from app.gemini_extractor import (
    GeminiExtractionError,
    _items_to_parsed_topics,
    _parse_gemini_json,
)
from app.models import PriorityLevel


def test_parse_gemini_json_accepts_plain_array():
    raw = '[{"title": "Thermodynamics", "priority": "high", "marks": 15}]'
    items = _parse_gemini_json(raw)
    assert len(items) == 1
    assert items[0]["title"] == "Thermodynamics"


def test_parse_gemini_json_strips_markdown_fences():
    raw = """```json
[{"title": "Optics", "priority": "low", "marks": null}]
```"""
    items = _parse_gemini_json(raw)
    assert items[0]["title"] == "Optics"


def test_items_to_parsed_topics_maps_priority_and_weight():
    topics = _items_to_parsed_topics(
        [
            {"title": "Thermodynamics", "priority": "high", "marks": 15},
            {"title": "Optics", "priority": "low", "marks": None},
        ]
    )
    assert topics[0]["priority"] == PriorityLevel.HIGH
    assert topics[0]["marks"] == 15.0
    assert topics[0]["weight"] > topics[1]["weight"]
    assert topics[1]["priority"] == PriorityLevel.LOW


def test_parse_gemini_json_rejects_non_array():
    try:
        _parse_gemini_json('{"title": "Only one"}')
        assert False, "expected GeminiExtractionError"
    except GeminiExtractionError as exc:
        assert "array" in str(exc).lower()
