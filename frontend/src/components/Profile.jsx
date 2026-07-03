import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDuration } from "../utils/time";

export default function Profile({ onBack, onOpenPlan, onSignOut, onEmailChanged }) {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setAccountError("");
    setProgressError("");
    try {
      const [meRes, progressRes] = await Promise.all([api.getMe(), api.getProgress()]);
      setProfile(meRes.data);
      setFullName(meRes.data.full_name || "");
      setEmail(meRes.data.email);
      setProgress(progressRes.data);
    } catch {
      setAccountError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAccountError("");
    setAccountSuccess("");
    setSaving(true);

    const patch = {};
    const trimmedName = fullName.trim();
    if (trimmedName !== (profile.full_name || "")) {
      patch.full_name = trimmedName || null;
    }
    if (email !== profile.email) {
      patch.email = email;
    }

    if (Object.keys(patch).length === 0) {
      setAccountSuccess("No changes to save.");
      setSaving(false);
      return;
    }

    try {
      const res = await api.updateMe(patch);
      setProfile(res.data);
      setFullName(res.data.full_name || "");
      setEmail(res.data.email);

      if (patch.email) {
        onEmailChanged?.();
        return;
      }

      setAccountSuccess("Profile updated.");
    } catch (err) {
      setAccountError(err.response?.data?.detail || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(planId, e) {
    e.stopPropagation();
    if (!confirm("Delete this schedule? This can't be undone.")) return;
    setProgressError("");
    try {
      await api.deletePlan(planId);
      const res = await api.getProgress();
      setProgress(res.data);
    } catch (err) {
      setProgressError(err.response?.data?.detail || "Could not delete schedule.");
    }
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "This will permanently delete your account and all study plans. This can't be undone."
      )
    ) {
      return;
    }
    setAccountError("");
    setDeletingAccount(true);
    try {
      await api.deleteMe();
      onSignOut();
    } catch (err) {
      setAccountError(err.response?.data?.detail || "Could not delete account.");
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <div className="main">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button className="btn ghost" onClick={onBack} style={{ paddingLeft: 0 }}>
          ← Back
        </button>
        <button className="btn ghost" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      <div className="eyebrow">Settings</div>
      <h1>Profile</h1>

      <h2 style={{ marginBottom: 12 }}>Account</h2>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480, marginBottom: 40 }}>
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {accountError && <div className="error-msg">{accountError}</div>}
        {accountSuccess && (
          <div className="success-msg" style={{ marginBottom: 14 }}>
            {accountSuccess}
          </div>
        )}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? <span className="spinner" /> : "Save"}
        </button>
      </form>

      <h2 style={{ marginBottom: 16 }}>Your progress</h2>
      {progressError && <div className="error-msg" style={{ marginBottom: 12 }}>{progressError}</div>}
      {!progress || progress.plans.length === 0 ? (
        <p style={{ fontSize: 14, marginBottom: 40 }}>You haven&apos;t generated any study plans yet.</p>
      ) : (
        <>
          <div className="plan-summary">
            <div className="summary-stat">
              <div className="value">
                {formatDuration(progress.completed_hours)} / {formatDuration(progress.total_hours)}
              </div>
              <div className="label">Hours studied / planned</div>
            </div>
            <div className="summary-stat">
              <div className="value">
                {progress.completed_sessions}/{progress.total_sessions}
              </div>
              <div className="label">Sessions completed</div>
            </div>
            <div className="summary-stat">
              <div className="value">{progress.percent_complete}%</div>
              <div className="label">Percent complete</div>
            </div>
          </div>

          <div className="progress-plan-list" style={{ marginBottom: 40 }}>
            {progress.plans.map((plan) => (
              <div
                className="progress-plan-card card progress-plan-clickable"
                key={plan.plan_id}
                onClick={() => onOpenPlan?.(plan.plan_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenPlan?.(plan.plan_id);
                  }
                }}
              >
                <div className="progress-plan-header">
                  <div>
                    <div style={{ fontWeight: 500 }}>{plan.syllabus_filename}</div>
                    <div className="topic-meta">
                      {plan.completed_sessions}/{plan.total_sessions} sessions
                    </div>
                  </div>
                  <button
                    className="btn danger"
                    type="button"
                    onClick={(e) => handleDeletePlan(plan.plan_id, e)}
                  >
                    Delete
                  </button>
                </div>
                <div className="progress-bar" style={{ marginTop: 10 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${plan.percent_complete}%`, background: "var(--low)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="danger-zone card">
        <h2 style={{ color: "var(--high)", marginBottom: 8 }}>Danger zone</h2>
        <p style={{ fontSize: 14, marginBottom: 16 }}>
          Permanently delete your account and all syllabi, study plans, and progress data.
        </p>
        <button
          className="btn danger"
          type="button"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? <span className="spinner" /> : "Delete account"}
        </button>
      </div>
    </div>
  );
}
