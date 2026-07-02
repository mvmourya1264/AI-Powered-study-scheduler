"""
Scheduling algorithm.

Step 1 - Time allocation per topic:
    Each topic gets a share of total available hours proportional to its
    `weight` (derived from priority/marks), unless the user manually set
    `estimated_hours` on the topic (that value is respected as-is).

Step 2 - Packing into days:
    Topics are ordered by priority weight (highest first) so that
    high-priority material is studied earliest, leaving more time for
    revision before the exam. Each topic's allocated hours are packed
    into daily slots of `hours_per_day` capacity; a topic that doesn't
    fit in the remaining capacity of a day is split across days.

Returns a list of dicts ready to become ScheduleSession rows:
    { topic_id, day_number, allocated_hours }
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional, TypedDict


@dataclass
class SchedTopic:
    id: int
    title: str
    weight: float
    estimated_hours: Optional[float] = None


class SessionAllocation(TypedDict):
    topic_id: int
    day_number: int
    date: Optional[datetime]
    allocated_hours: float


def allocate_hours(topics: List[SchedTopic], total_hours: float) -> dict:
    """Return {topic_id: hours} respecting manual overrides, then splitting
    the remaining hour budget among the rest proportional to weight."""
    manual = {t.id: t.estimated_hours for t in topics if t.estimated_hours}
    manual_total = sum(manual.values())
    remaining_hours = max(0.0, total_hours - manual_total)

    auto_topics = [t for t in topics if not t.estimated_hours]
    weight_sum = sum(t.weight for t in auto_topics) or 1.0

    hours_by_topic = dict(manual)
    for t in auto_topics:
        hours_by_topic[t.id] = round((t.weight / weight_sum) * remaining_hours, 2)

    return hours_by_topic


def pack_into_days(
    topics: List[SchedTopic],
    hours_by_topic: dict,
    total_days: int,
    hours_per_day: float,
    start_date: Optional[datetime] = None,
) -> List[SessionAllocation]:
    # highest priority weight first -> studied earliest
    ordered = sorted(topics, key=lambda t: hours_by_topic.get(t.id, 0) and -t.weight)

    sessions: List[SessionAllocation] = []
    day = 1
    remaining_today = hours_per_day

    for t in ordered:
        hours_left = hours_by_topic.get(t.id, 0.0)
        if hours_left <= 0:
            continue

        while hours_left > 0 and day <= total_days:
            if remaining_today <= 0.01:
                day += 1
                remaining_today = hours_per_day
                if day > total_days:
                    break

            chunk = min(hours_left, remaining_today)
            chunk = round(chunk, 2)
            if chunk <= 0:
                break

            date = start_date + timedelta(days=day - 1) if start_date else None
            sessions.append(
                SessionAllocation(
                    topic_id=t.id,
                    day_number=day,
                    date=date,
                    allocated_hours=chunk,
                )
            )
            hours_left -= chunk
            remaining_today -= chunk

        # if we ran out of days entirely, remaining topics just get dropped
        # (caller can detect this by comparing total allocated vs requested)
        if day > total_days:
            continue

    return sessions


def generate_schedule(
    topics: List[SchedTopic],
    total_days: int,
    hours_per_day: float,
    start_date: Optional[datetime] = None,
) -> List[SessionAllocation]:
    total_hours = total_days * hours_per_day
    hours_by_topic = allocate_hours(topics, total_hours)
    return pack_into_days(topics, hours_by_topic, total_days, hours_per_day, start_date)
