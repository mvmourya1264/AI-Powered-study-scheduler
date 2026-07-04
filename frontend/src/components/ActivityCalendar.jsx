import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatDuration } from "../utils/time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_CLASS = {
  high: "high",
  medium: "medium",
  low: "low",
};

function dateKey(year, month, day) {
  const d = new Date(year, month, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function sessionIntensity(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
}

function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    cells.push({
      date: dateKey(year, month - 1, day),
      day,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: dateKey(year, month, day),
      day,
      inMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: dateKey(year, month + 1, nextDay),
      day: nextDay,
      inMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CalendarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export { CalendarIcon };

export default function ActivityCalendar({ open, onClose }) {
  const navigate = useNavigate();
  const [calendarDays, setCalendarDays] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!open) {
      setCalendarDays(null);
      setSelectedDate(null);
      setError("");
      const t = new Date();
      setViewMonth({ year: t.getFullYear(), month: t.getMonth() });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getCalendar()
      .then((res) => {
        if (!cancelled) setCalendarDays(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load calendar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const day of calendarDays || []) {
      map[day.date] = day.sessions;
    }
    return map;
  }, [calendarDays]);

  const monthCells = useMemo(
    () => buildMonthCells(viewMonth.year, viewMonth.month),
    [viewMonth]
  );

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function goPrevMonth() {
    setViewMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function goNextMonth() {
    setViewMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  function updateSessionCompleted(sessionId, completed) {
    setCalendarDays((prev) =>
      (prev || []).map((day) => ({
        ...day,
        sessions: day.sessions.map((s) =>
          s.session_id === sessionId ? { ...s, completed } : s
        ),
      }))
    );
  }

  async function toggleSession(session) {
    const next = !session.completed;
    updateSessionCompleted(session.session_id, next);
    try {
      await api.updateSession(session.session_id, next);
    } catch {
      updateSessionCompleted(session.session_id, session.completed);
    }
  }

  function openPlan(planId) {
    onClose();
    navigate(`/schedule/${planId}`);
  }

  const selectedSessions = selectedDate ? sessionsByDate[selectedDate] || [] : [];

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card activity-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Study schedule calendar"
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">Schedule</div>
            <h2 style={{ margin: 0 }}>{selectedDate ? "Day detail" : "Calendar"}</h2>
          </div>
          <button className="btn ghost" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <span className="spinner" />
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : selectedDate ? (
          <>
            <button
              className="btn ghost"
              type="button"
              style={{ paddingLeft: 0, marginBottom: 12 }}
              onClick={() => setSelectedDate(null)}
            >
              ← Back to calendar
            </button>
            <p className="topic-meta" style={{ marginBottom: 16 }}>
              {formatDisplayDate(selectedDate)}
            </p>
            {selectedSessions.length === 0 ? (
              <p style={{ fontSize: 14 }}>Nothing scheduled this day.</p>
            ) : (
              <div className="calendar-day-sessions">
                {selectedSessions.map((session) => (
                  <div className="calendar-session-row" key={session.session_id}>
                    <label className={`session-line${session.completed ? " completed" : ""}`}>
                      <input
                        type="checkbox"
                        checked={session.completed}
                        onChange={() => toggleSession(session)}
                      />
                      <span className={`priority-dot ${PRIORITY_CLASS[session.priority]}`} />
                      <span className="session-title">{session.topic_title}</span>
                      <span className="session-hours">{formatDuration(session.allocated_hours)}</span>
                    </label>
                    <button
                      type="button"
                      className="calendar-plan-link topic-meta"
                      onClick={() => openPlan(session.plan_id)}
                    >
                      from: {session.syllabus_filename}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="calendar-nav">
              <button className="btn ghost" type="button" onClick={goPrevMonth} aria-label="Previous month">
                ←
              </button>
              <div className="calendar-month-label">{monthLabel}</div>
              <button className="btn ghost" type="button" onClick={goNextMonth} aria-label="Next month">
                →
              </button>
            </div>

            <div className="month-calendar">
              <div className="month-calendar-weekdays">
                {WEEKDAYS.map((label) => (
                  <div key={label} className="month-calendar-weekday">
                    {label}
                  </div>
                ))}
              </div>
              <div className="month-calendar-grid">
                {monthCells.map((cell) => {
                  const count = (sessionsByDate[cell.date] || []).length;
                  const level = sessionIntensity(count);
                  const isToday = cell.date === todayKey();
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      className={[
                        "month-calendar-cell",
                        `intensity-${level}`,
                        cell.inMonth ? "in-month" : "out-month",
                        isToday ? "is-today" : "",
                        selectedDate === cell.date ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedDate(cell.date)}
                      title={
                        count
                          ? `${cell.date}: ${count} scheduled session${count === 1 ? "" : "s"}`
                          : cell.date
                      }
                    >
                      <span className="month-calendar-day-num">{cell.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="activity-legend">
              <span className="topic-meta">Less</span>
              <div className="month-calendar-legend-swatch intensity-0" />
              <div className="month-calendar-legend-swatch intensity-1" />
              <div className="month-calendar-legend-swatch intensity-2" />
              <div className="month-calendar-legend-swatch intensity-3" />
              <span className="topic-meta">More</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
