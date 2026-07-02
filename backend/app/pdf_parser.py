"""
Heuristic syllabus PDF parser.

Goal: turn a syllabus PDF into a list of topics, each with a best-guess
priority/weight, without requiring a strict format. It supports three
common patterns and falls back gracefully:

  1. Explicit priority labels     -> "Thermodynamics - High Priority"
  2. Marks / weightage numbers    -> "Thermodynamics (10 marks)" or "Thermodynamics - 15"
  3. Plain list, no priority info -> every line becomes a topic with
                                      default MEDIUM priority/weight 1.0
                                      (user assigns priority manually later)
"""
import re
from io import BytesIO
from typing import BinaryIO, List, TypedDict

import pdfplumber

from .models import PriorityLevel


class ParsedTopic(TypedDict):
    title: str
    priority: PriorityLevel
    weight: float
    marks: float | None
    order_index: int


PRIORITY_WORDS = {
    PriorityLevel.HIGH: [
        r"\bhigh\s*priority\b", r"\bhigh\b", r"\bmust\s*do\b", r"\bimportant\b", r"\bcritical\b",
    ],
    PriorityLevel.MEDIUM: [
        r"\bmedium\s*priority\b", r"\bmedium\b", r"\bmoderate\b",
    ],
    PriorityLevel.LOW: [
        r"\blow\s*priority\b", r"\blow\b", r"\boptional\b", r"\bskip\s*able\b",
    ],
}

MARKS_PATTERN = re.compile(r"\(?\b(\d{1,3})\s*(?:marks|mark|pts|points|%)\)?", re.IGNORECASE)

# lines that are clearly headers/noise we should ignore
NOISE_PATTERNS = [
    re.compile(r"^\s*(page|table of contents|exam pattern)\b", re.IGNORECASE),
    re.compile(r"\bsyllabus\b", re.IGNORECASE),   # title lines like "X Syllabus - Final Exam"
    re.compile(r"^\s*\d+\s*$"),  # bare page numbers
]

# bullets / numbering prefixes to strip
BULLET_PREFIX = re.compile(r"^\s*(?:[-*•▪●]|(?:\d+[\.\)])|(?:[a-zA-Z][\.\)]))\s+")


def _detect_priority(line: str) -> PriorityLevel | None:
    lowered = line.lower()
    for level, patterns in PRIORITY_WORDS.items():
        for pat in patterns:
            if re.search(pat, lowered):
                return level
    return None


def _detect_marks(line: str) -> float | None:
    match = MARKS_PATTERN.search(line)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _line_looks_complete(raw_line: str) -> bool:
    """Whether a line looks like a finished topic title (not mid-wrap)."""
    stripped = raw_line.strip()
    if re.search(r"[.!?]\s*$", stripped):
        return True
    if _detect_priority(raw_line) or _detect_marks(raw_line):
        return True
    return False


def _looks_like_standalone_topic(line: str) -> bool:
    """Short, capitalized lines are usually their own topic, not wrap fragments."""
    words = line.split()
    return bool(line and line[0].isupper() and len(words) <= 2)


def _is_wrapped_continuation(prev_raw_line: str, line: str) -> bool:
    """
    Detect PDF line-wrap continuations vs a new plain-list topic.

    Tradeoff: plain syllabi (one short topic per line, no bullets) look identical
    to wrapped titles on the continuation line. We merge only when the previous
    line looks cut off *and* was long enough to plausibly wrap, or when the
    current line starts lowercase (strong wrap signal). Short capitalized lines
    (≤2 words) are treated as new topics so "Sorting Algorithms" after a long
    wrapped title is not swallowed into it.
    """
    if BULLET_PREFIX.match(line):
        return False
    if any(p.search(line) for p in NOISE_PATTERNS):
        return False

    if line and line[0].islower():
        return True

    if _looks_like_standalone_topic(line):
        return False

    if _line_looks_complete(prev_raw_line):
        return False

    prev = prev_raw_line.strip()
    if len(prev) >= 30 or len(prev.split()) >= 4:
        return True

    return False


def _clean_title(line: str) -> str:
    title = BULLET_PREFIX.sub("", line).strip()
    # strip trailing priority/marks annotations like "- High Priority" or "(10 marks)"
    title = re.sub(r"[-–—:]\s*(high|medium|low)\s*priority\s*$", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\(?\d{1,3}\s*(marks|mark|pts|points|%)\)?\s*$", "", title, flags=re.IGNORECASE)
    title = title.strip(" -–—:")
    return title.strip()


def _priority_to_weight(priority: PriorityLevel, marks: float | None) -> float:
    if marks is not None:
        # normalize marks roughly into a 0.5 - 3.0 weight range
        return max(0.5, min(3.0, marks / 10.0 + 0.5))
    return {PriorityLevel.HIGH: 2.0, PriorityLevel.MEDIUM: 1.0, PriorityLevel.LOW: 0.5}[priority]


def extract_text(file: BinaryIO | bytes) -> str:
    if isinstance(file, bytes):
        file = BytesIO(file)
    text_parts = []
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts)


def parse_syllabus_text(raw_text: str) -> List[ParsedTopic]:
    topics: List[ParsedTopic] = []
    order_index = 0
    last_raw_line: str | None = None

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line or len(line) < 3:
            continue
        if any(p.search(line) for p in NOISE_PATTERNS):
            continue

        if topics and last_raw_line and _is_wrapped_continuation(last_raw_line, line):
            continuation = _clean_title(line)
            if continuation:
                topics[-1]["title"] = f"{topics[-1]['title']} {continuation}".strip()
            last_raw_line = f"{last_raw_line} {line}"
            continue

        # Only treat as a topic line if it looks like a list item, a heading,
        # or is reasonably short (avoid sucking in whole paragraphs).
        looks_like_item = bool(BULLET_PREFIX.match(line)) or len(line.split()) <= 14
        if not looks_like_item:
            continue

        priority = _detect_priority(line)
        marks = _detect_marks(line)
        title = _clean_title(line)

        if not title or len(title) < 3:
            continue

        resolved_priority = priority or PriorityLevel.MEDIUM
        weight = _priority_to_weight(resolved_priority, marks)

        topics.append(
            ParsedTopic(
                title=title,
                priority=resolved_priority,
                weight=weight,
                marks=marks,
                order_index=order_index,
            )
        )
        order_index += 1
        last_raw_line = line

    return topics


def parse_pdf(file: BinaryIO | bytes) -> tuple[str, List[ParsedTopic]]:
    raw_text = extract_text(file)
    topics = parse_syllabus_text(raw_text)
    return raw_text, topics
