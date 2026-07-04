import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildWeekColumns(activityByDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  while (start.getDay() !== 0) {
    start.setDate(start.getDate() - 1);
  }

  const weeks = [];
  const cursor = new Date(start);

  while (cursor <= today || weeks.length === 0) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(cursor);
      cellDate.setDate(cursor.getDate() + i);
      if (cellDate > today) {
        week.push(null);
      } else {
        const key = dateKey(cellDate);
        const entry = activityByDate[key];
        week.push({
          date: key,
          sessions_completed: entry?.sessions_completed || 0,
          hours_completed: entry?.hours_completed || 0,
        });
      }
    }
    weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
    if (cursor > today && weeks.length >= 53) break;
  }

  return weeks;
}

function cellLevel(count, max) {
  if (!count) return 0;
  if (max <= 1) return 3;
  const ratio = count / max;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
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
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getActivity()
      .then((res) => {
        if (!cancelled) setActivity(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load activity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const activityByDate = useMemo(() => {
    const map = {};
    for (const day of activity?.days || []) {
      map[day.date] = day;
    }
    return map;
  }, [activity]);

  const weeks = useMemo(() => buildWeekColumns(activityByDate), [activityByDate]);

  const maxSessions = useMemo(() => {
    return Math.max(0, ...(activity?.days || []).map((d) => d.sessions_completed));
  }, [activity]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card activity-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Study activity calendar"
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">Activity</div>
            <h2 style={{ margin: 0 }}>Study calendar</h2>
          </div>
          <button className="btn ghost" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <span className="spinner" />
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : (
          <>
            <div className="activity-summary">
              <div className="summary-stat">
                <div className="value">{activity?.current_streak ?? 0}</div>
                <div className="label">Day streak</div>
              </div>
              <div className="summary-stat">
                <div className="value">{activity?.total_active_days ?? 0}</div>
                <div className="label">Active days</div>
              </div>
            </div>

            <div className="activity-heatmap-wrap">
              <div className="activity-day-labels">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => (
                  <span key={label} className="activity-day-label" style={{ gridRow: i + 1 }}>
                    {i % 2 === 1 ? label : ""}
                  </span>
                ))}
              </div>
              <div className="activity-heatmap">
                {weeks.map((week, wi) => (
                  <div className="activity-week" key={wi}>
                    {week.map((cell, di) =>
                      cell ? (
                        <div
                          key={cell.date}
                          className={`activity-cell level-${cellLevel(cell.sessions_completed, maxSessions)}`}
                          onMouseEnter={() => setHovered(cell)}
                          onMouseLeave={() => setHovered(null)}
                          title={`${cell.date}: ${cell.sessions_completed} session(s)`}
                        />
                      ) : (
                        <div key={`empty-${wi}-${di}`} className="activity-cell empty" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {hovered && (
              <div className="activity-tooltip">
                <strong>{hovered.date}</strong>
                <span>
                  {hovered.sessions_completed} session{hovered.sessions_completed === 1 ? "" : "s"} completed
                </span>
              </div>
            )}

            <div className="activity-legend">
              <span className="topic-meta">Less</span>
              <div className="activity-cell level-0" />
              <div className="activity-cell level-1" />
              <div className="activity-cell level-2" />
              <div className="activity-cell level-3" />
              <span className="topic-meta">More</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
