import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDuration } from "../utils/time";

export default function ProgressView({ onBack, onOpenPlan }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.getProgress();
      setProgress(res.data);
    } catch {
      setError("Could not load progress.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="main">
        <span className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="main">
        <button className="btn ghost" onClick={onBack} style={{ marginBottom: 12, paddingLeft: 0 }}>
          ← Back
        </button>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  return (
    <div className="main">
      <button className="btn ghost" onClick={onBack} style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← Back
      </button>
      <div className="eyebrow">Overview</div>
      <h1>Study progress</h1>
      <p>Your completion stats across all study plans.</p>

      <div className="plan-summary">
        <div className="summary-stat">
          <div className="value">{progress.completion_pct}%</div>
          <div className="label">Overall complete</div>
        </div>
        <div className="summary-stat">
          <div className="value">
            {progress.completed_sessions}/{progress.total_sessions}
          </div>
          <div className="label">Sessions done</div>
        </div>
        <div className="summary-stat">
          <div className="value">{formatDuration(progress.completed_hours)}</div>
          <div className="label">Time completed</div>
        </div>
        <div className="summary-stat">
          <div className="value">{progress.total_plans}</div>
          <div className="label">Plans</div>
        </div>
      </div>

      {progress.total_hours > 0 && (
        <div className="progress-overview">
          <div className="progress-bar-label">
            <span>Total scheduled time</span>
            <span className="topic-meta">
              {formatDuration(progress.completed_hours)} of {formatDuration(progress.total_hours)}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress.total_hours ? (progress.completed_hours / progress.total_hours) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {progress.plans.length === 0 ? (
        <p style={{ fontSize: 14 }}>No study plans yet — generate one from a syllabus to track progress.</p>
      ) : (
        <div className="progress-plan-list">
          <h2 style={{ marginBottom: 16 }}>By plan</h2>
          {progress.plans.map((plan) => (
            <div className="progress-plan-card card" key={plan.plan_id}>
              <div className="progress-plan-header">
                <div>
                  <div style={{ fontWeight: 500 }}>{plan.syllabus_filename}</div>
                  <div className="topic-meta">
                    {plan.total_days}-day plan · {plan.completed_sessions}/{plan.total_sessions} sessions
                  </div>
                </div>
                <div className="progress-plan-pct">{plan.completion_pct}%</div>
              </div>
              <div className="progress-bar" style={{ marginTop: 12 }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${plan.completion_pct}%` }}
                />
              </div>
              <div className="progress-plan-footer">
                <span className="topic-meta">
                  {formatDuration(plan.completed_hours)} of {formatDuration(plan.total_hours)} completed
                </span>
                {onOpenPlan && (
                  <button
                    className="btn ghost"
                    type="button"
                    style={{ padding: "4px 0" }}
                    onClick={() => onOpenPlan(plan.plan_id)}
                  >
                    View schedule →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
