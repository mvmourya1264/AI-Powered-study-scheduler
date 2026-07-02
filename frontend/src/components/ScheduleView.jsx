import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDuration } from "../utils/time";

const PRIORITY_COLOR = {
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

function groupByDay(sessions) {
  const days = {};
  for (const s of sessions) {
    if (!days[s.day_number]) days[s.day_number] = [];
    days[s.day_number].push(s);
  }
  return Object.entries(days)
    .map(([day, sessions]) => ({ day: Number(day), sessions }))
    .sort((a, b) => a.day - b.day);
}

export default function ScheduleView({ planId, onBack }) {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    load();
  }, [planId]);

  async function load() {
    const res = await api.getPlan(planId);
    setPlan(res.data);
  }

  async function toggleSession(session) {
    setPlan((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === session.id ? { ...s, completed: !s.completed } : s
      ),
    }));
    await api.updateSession(session.id, !session.completed);
  }

  if (!plan) return <div className="main"><span className="spinner" /></div>;

  const days = groupByDay(plan.sessions);
  const totalHours = plan.sessions.reduce((sum, s) => sum + s.allocated_hours, 0);
  const completedCount = plan.sessions.filter((s) => s.completed).length;
  const totalTopics = new Set(plan.sessions.map((s) => s.topic_id)).size;

  return (
    <div className="main">
      <button className="btn ghost" onClick={onBack} style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← Back
      </button>
      <div className="eyebrow">Your schedule</div>
      <h1>{plan.total_days}-day study plan</h1>
      <p>{plan.hours_per_day} hours a day, weighted by topic priority.</p>

      <div className="plan-summary">
        <div className="summary-stat">
          <div className="value">{formatDuration(totalHours)}</div>
          <div className="label">Total study time</div>
        </div>
        <div className="summary-stat">
          <div className="value">{totalTopics}</div>
          <div className="label">Topics covered</div>
        </div>
        <div className="summary-stat">
          <div className="value">{completedCount}/{plan.sessions.length}</div>
          <div className="label">Sessions done</div>
        </div>
      </div>

      <div className="day-rail">
        {days.map(({ day, sessions }) => {
          const dayTotal = sessions.reduce((sum, s) => sum + s.allocated_hours, 0);
          const date = sessions[0]?.date ? new Date(sessions[0].date) : null;
          return (
            <div className="day-card" key={day}>
              <div className="day-label">
                <span className="day-num">{String(day).padStart(2, "0")}</span>
                {date && date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
              <div>
                <div className="day-bar">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="day-bar-segment"
                      style={{
                        flex: `${s.allocated_hours} 1 0`,
                        background: PRIORITY_COLOR[s.topic.priority],
                      }}
                      title={`${s.topic.title} — ${formatDuration(s.allocated_hours)}`}
                    >
                      {s.allocated_hours >= 0.75 ? s.topic.title : ""}
                    </div>
                  ))}
                </div>
                <div className="day-sessions">
                  {sessions.map((s) => (
                    <label className={`session-line${s.completed ? " completed" : ""}`} key={s.id}>
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => toggleSession(s)}
                      />
                      <span
                        className="priority-dot"
                        style={{ background: PRIORITY_COLOR[s.topic.priority] }}
                      />
                      <span className="session-title">{s.topic.title}</span>
                      <span className="session-hours">{formatDuration(s.allocated_hours)}</span>
                    </label>
                  ))}
                  <div className="topic-meta" style={{ marginTop: 2 }}>
                    {formatDuration(dayTotal)} scheduled
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
