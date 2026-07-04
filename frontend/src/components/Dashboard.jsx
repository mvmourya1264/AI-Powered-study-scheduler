import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatDuration } from "../utils/time";
import { useAppData } from "../context/AppDataContext";

const PRIORITY_CLASS = { high: "high", medium: "medium", low: "low" };
const CHART_COLORS = ["var(--high)", "var(--medium)", "var(--low)", "var(--focus-ring)", "#8B7355"];

function formatApiError(err, label = "Request") {
  const status = err?.response?.status;
  const data = err?.response?.data;
  let detail = err?.message || "Unknown error";

  if (typeof data?.detail === "string") {
    detail = data.detail;
  } else if (Array.isArray(data?.detail)) {
    detail = data.detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  } else if (data && typeof data === "object") {
    detail = JSON.stringify(data);
  }

  console.error(`${label} failed`, {
    status,
    data,
    message: err?.message,
  });

  return status ? `${label} failed (${status}): ${detail}` : `${label} failed: ${detail}`;
}

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function WeeklyBarChart({ data }) {
  const maxHours = Math.max(...data.map((d) => d.hours_completed), 1);
  const chartHeight = 120;

  return (
    <div className="weekly-chart">
      <div className="weekly-chart-bars" style={{ height: chartHeight }}>
        {data.map((day) => {
          const barHeight = (day.hours_completed / maxHours) * chartHeight;
          const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
          });
          return (
            <div className="weekly-chart-col" key={day.date}>
              <div className="weekly-chart-bar-wrap" style={{ height: chartHeight }}>
                <div
                  className="weekly-chart-bar"
                  style={{ height: `${barHeight}px` }}
                  title={`${formatDuration(day.hours_completed)} completed`}
                />
              </div>
              <span className="weekly-chart-label">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubjectDonutChart({ subjects }) {
  if (!subjects.length) {
    return <p className="topic-meta">No study plans yet — upload a syllabus to get started.</p>;
  }

  const totalHours = subjects.reduce((sum, s) => sum + s.hours_total, 0) || 1;
  const overallPercent =
    subjects.reduce((sum, s) => sum + s.hours_completed, 0) / totalHours * 100;

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 58;
  const innerR = 38;
  let angle = -90;

  function arcPath(startAngle, endAngle) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + outerR * Math.cos(toRad(startAngle));
    const y1 = cy + outerR * Math.sin(toRad(startAngle));
    const x2 = cx + outerR * Math.cos(toRad(endAngle));
    const y2 = cy + outerR * Math.sin(toRad(endAngle));
    const x3 = cx + innerR * Math.cos(toRad(endAngle));
    const y3 = cy + innerR * Math.sin(toRad(endAngle));
    const x4 = cx + innerR * Math.cos(toRad(startAngle));
    const y4 = cy + innerR * Math.sin(toRad(startAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
  }

  const slices = subjects.map((plan, i) => {
    const sliceAngle = (plan.hours_total / totalHours) * 360;
    const start = angle;
    const end = angle + sliceAngle;
    angle = end;
    const fillPercent = plan.percent_complete / 100;
    return {
      plan,
      path: arcPath(start, end),
      color: CHART_COLORS[i % CHART_COLORS.length],
      fillPercent,
    };
  });

  return (
    <div className="donut-chart-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart">
        {slices.map(({ plan, path, color, fillPercent }, i) => (
          <g key={plan.plan_id}>
            <path d={path} fill="var(--rule)" />
            <path d={path} fill={color} opacity={0.25 + fillPercent * 0.75} />
          </g>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="donut-center-value">
          {Math.round(overallPercent)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="donut-center-label">
          overall
        </text>
      </svg>
      <ul className="donut-legend">
        {subjects.map((plan, i) => (
          <li key={plan.plan_id}>
            <span
              className="donut-legend-swatch"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="donut-legend-name">{plan.syllabus_filename}</span>
            <span className="donut-legend-pct">{plan.percent_complete}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { syllabi, plansBySyllabus, loading: syllabiLoading, addSyllabus, deleteSyllabus } =
    useAppData();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const res = await api.getDashboard();
      setDashboard(res.data);
    } catch (err) {
      setError(formatApiError(err, "Could not load dashboard"));
    } finally {
      setLoading(false);
    }
  }

  function updateDashboardSession(sessionId, completed, hours) {
    setDashboard((prev) => {
      if (!prev) return prev;
      const sessions = prev.today.sessions.map((s) =>
        s.session_id === sessionId ? { ...s, completed } : s
      );
      const sessionsCompleted = sessions.filter((s) => s.completed).length;
      const totalHoursCompleted = sessions
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + hoursBetween(s.start_time, s.end_time), 0);

      const weekly = prev.weekly_study_hours.map((day) => {
        if (day.date !== prev.today.date) return day;
        const delta = completed ? hours : -hours;
        return {
          ...day,
          hours_completed: Math.max(0, round2(day.hours_completed + delta)),
        };
      });

      const subjectProgress = prev.subject_progress.map((plan) => {
        const session = prev.today.sessions.find((s) => s.session_id === sessionId);
        if (!session || session.plan_id !== plan.plan_id) return plan;
        const completedDelta = completed ? 1 : -1;
        const newCompleted = plan.completed_sessions + completedDelta;
        const hoursCompleted = Math.max(0, round2(plan.hours_completed + (completed ? hours : -hours)));
        const percent = plan.total_sessions
          ? round1((newCompleted / plan.total_sessions) * 100)
          : 0;
        return {
          ...plan,
          completed_sessions: newCompleted,
          hours_completed: hoursCompleted,
          percent_complete: percent,
        };
      });

      return {
        ...prev,
        today: {
          ...prev.today,
          sessions,
          sessions_completed: sessionsCompleted,
          total_hours_completed: round2(totalHoursCompleted),
        },
        weekly_study_hours: weekly,
        subject_progress: subjectProgress,
      };
    });
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  async function toggleSession(session) {
    const hours = hoursBetween(session.start_time, session.end_time);
    const next = !session.completed;
    updateDashboardSession(session.session_id, next, hours);
    try {
      await api.updateSession(session.session_id, next);
    } catch {
      updateDashboardSession(session.session_id, session.completed, hours);
    }
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF file.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const res = await api.uploadSyllabus(file);
      addSyllabus(res.data);
      navigate(`/topics/${res.data.id}`);
    } catch (err) {
      setUploadError(err?.response?.data?.detail || "Upload failed. Try another file.");
    } finally {
      setUploading(false);
    }
  }

  function handleSelectSyllabus(syllabusId) {
    const plan = plansBySyllabus[syllabusId];
    if (plan?.id) navigate(`/schedule/${plan.id}`);
    else navigate(`/topics/${syllabusId}`);
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this syllabus and its schedules?")) return;
    setUploadError("");
    setDeletingId(id);
    try {
      await deleteSyllabus(id);
      await loadDashboard();
    } catch (err) {
      setUploadError(err?.response?.data?.detail || "Could not delete syllabus.");
    } finally {
      setDeletingId(null);
    }
  }

  const goalProgress =
    dashboard && dashboard.daily_goal_hours > 0
      ? Math.min(100, (dashboard.today.total_hours_completed / dashboard.daily_goal_hours) * 100)
      : 0;

  return (
    <div className="main dashboard-main">
      {loading ? (
        <span className="spinner" />
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : dashboard ? (
        <>
          <div className="dashboard-header">
            <div>
              <div className="eyebrow">Overview</div>
              <h1>
                {timeOfDayGreeting()}, {dashboard.greeting_name}!
              </h1>
            </div>
            {dashboard.streak_days > 0 && (
              <div className="streak-badge">
                <span aria-hidden="true">🔥</span>
                {dashboard.streak_days}-day streak
              </div>
            )}
          </div>

          <div className="plan-summary dashboard-stats">
            <div className="summary-stat">
              <div className="value">{formatDuration(dashboard.today.total_hours_completed)}</div>
              <div className="label">
                Study time today
                {dashboard.today.total_hours_scheduled > 0 && (
                  <span className="stat-sub">
                    {" "}
                    of {formatDuration(dashboard.today.total_hours_scheduled)}
                  </span>
                )}
              </div>
            </div>
            <div className="summary-stat">
              <div className="value">
                {dashboard.today.sessions_completed}/{dashboard.today.sessions_total}
              </div>
              <div className="label">Tasks completed</div>
            </div>
            <div className="summary-stat">
              <div className="value">{formatDuration(dashboard.today.total_hours_completed)}</div>
              <div className="label">Daily goal</div>
              <div className="goal-progress">
                <div className="goal-progress-bar" style={{ width: `${goalProgress}%` }} />
              </div>
              <div className="topic-meta goal-progress-caption">
                {formatDuration(dashboard.today.total_hours_completed)} /{" "}
                {formatDuration(dashboard.daily_goal_hours)} goal
              </div>
            </div>
          </div>

          <div className="card dashboard-panel">
            <h3>Today&apos;s schedule</h3>
            {dashboard.today.sessions.length === 0 ? (
              <p style={{ fontSize: 14, marginBottom: 0 }}>Nothing scheduled for today.</p>
            ) : (
              <div className="dashboard-schedule-list">
                {dashboard.today.sessions.map((session) => (
                  <div className="dashboard-schedule-row" key={session.session_id}>
                    <span className="dashboard-schedule-time">
                      {session.start_time} – {session.end_time}
                    </span>
                    <label className={`session-line${session.completed ? " completed" : ""}`}>
                      <input
                        type="checkbox"
                        checked={session.completed}
                        onChange={() => toggleSession(session)}
                      />
                      <span className={`priority-dot ${PRIORITY_CLASS[session.priority]}`} />
                      <span className="session-title">{session.topic_title}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-charts">
            <div className="card dashboard-panel">
              <h3>Study overview</h3>
              <p className="topic-meta" style={{ marginTop: 0 }}>
                Hours completed — last 7 days
              </p>
              <WeeklyBarChart data={dashboard.weekly_study_hours} />
            </div>
            <div className="card dashboard-panel">
              <h3>Subject progress</h3>
              <SubjectDonutChart subjects={dashboard.subject_progress} />
            </div>
          </div>
        </>
      ) : null}

      <div className="card dashboard-upload" style={{ marginTop: 24 }}>
        <h3>Upload a syllabus</h3>
        <p style={{ marginTop: 0 }}>
          Drop in a PDF with your exam syllabus to generate a new study plan.
        </p>
        <div
          className={`dropzone${dragActive ? " active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInput.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <span className="spinner" />
          ) : (
            <>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop your syllabus PDF here</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>or click to browse</div>
            </>
          )}
        </div>
        {uploadError && <div className="error-msg" style={{ marginTop: 12 }}>{uploadError}</div>}

        {syllabi.length > 0 && (
          <>
            <h4 style={{ marginTop: 24, marginBottom: 12 }}>Your syllabi</h4>
            {syllabiLoading ? (
              <span className="spinner" />
            ) : (
              <div className="syllabus-list">
                {syllabi.map((s) => {
                  const plan = plansBySyllabus[s.id];
                  return (
                    <div
                      key={s.id}
                      className="syllabus-item"
                      onClick={() => handleSelectSyllabus(s.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.filename}</div>
                        <div className="topic-meta">
                          {s.topics.length} topics ·{" "}
                          {new Date(s.uploaded_at).toLocaleDateString()}
                        </div>
                        <span className={`syllabus-action${plan ? " has-plan" : ""}`}>
                          {plan ? "View schedule" : "Set up schedule"}
                        </span>
                      </div>
                      <button
                        className="btn danger"
                        disabled={deletingId === s.id}
                        onClick={(e) => handleDelete(s.id, e)}
                      >
                        {deletingId === s.id ? <span className="spinner" /> : "Delete"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
