"""Compute sequential start/end clock times for sessions within a day."""

from datetime import datetime, timedelta
from typing import List, Sequence, Tuple


def _parse_hhmm(value: str) -> Tuple[int, int]:
    parts = value.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time format: {value!r}")
    hour, minute = int(parts[0]), int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Invalid time: {value!r}")
    return hour, minute


def compute_session_times(
    sessions: Sequence,
    daily_start_time: str = "09:00",
) -> List[Tuple[str, str]]:
    """
    Given an ordered list of sessions (each with allocated_hours), stack them
    back-to-back starting from daily_start_time. Returns (start_time, end_time)
    pairs as HH:MM strings.
    """
    hour, minute = _parse_hhmm(daily_start_time)
    current = datetime(2000, 1, 1, hour, minute)
    result: List[Tuple[str, str]] = []

    for session in sessions:
        start = current
        end = start + timedelta(hours=session.allocated_hours)
        result.append((start.strftime("%H:%M"), end.strftime("%H:%M")))
        current = end

    return result
