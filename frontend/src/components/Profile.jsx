import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatDuration } from "../utils/time";
import { useAppData } from "../context/AppDataContext";

export default function Profile() {
  const navigate = useNavigate();
  const { progress, loading: dataLoading, deletePlan, clearAll, refreshProgress } = useAppData();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dailyStartTime, setDailyStartTime] = useState("09:00");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setProfileLoading(true);
    setAccountError("");
    try {
      const meRes = await api.getMe();
      setProfile(meRes.data);
      setFullName(meRes.data.full_name || "");
      setEmail(meRes.data.email);
      setDailyStartTime(meRes.data.daily_start_time || "09:00");
      await refreshProgress();
    } catch {
      setAccountError("Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("token");
    clearAll();
    navigate("/login", { replace: true });
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
    if (dailyStartTime !== (profile.daily_start_time || "09:00")) {
      patch.daily_start_time = dailyStartTime;
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
      setDailyStartTime(res.data.daily_start_time || "09:00");

      if (patch.email) {
        alert("Email updated — please sign in again with your new email.");
        signOut();
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
    setDeletingPlanId(planId);
    try {
      await deletePlan(planId);
    } catch (err) {
      setProgressError(err.response?.data?.detail || "Could not delete schedule.");
    } finally {
      setDeletingPlanId(null);
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
      signOut();
    } catch (err) {
      setAccountError(err.response?.data?.detail || "Could not delete account.");
      setDeletingAccount(false);
    }
  }

  if (profileLoading || dataLoading) {
    return (
      <div className="main">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button className="btn ghost" onClick={() => navigate("/dashboard")} style={{ paddingLeft: 0 }}>
          ← Back
        </button>
        <button className="btn ghost" onClick={signOut}>
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
        <div className="field">
          <label htmlFor="dailyStartTime">Daily study start time</label>
          <input
            id="dailyStartTime"
            type="time"
            value={dailyStartTime}
            onChange={(e) => setDailyStartTime(e.target.value)}
          />
          <p className="topic-meta" style={{ marginTop: 6, marginBottom: 0 }}>
            Used to compute clock times on your dashboard schedule.
          </p>
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
                onClick={() => navigate(`/schedule/${plan.plan_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/schedule/${plan.plan_id}`);
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
                    disabled={deletingPlanId === plan.plan_id}
                    onClick={(e) => handleDeletePlan(plan.plan_id, e)}
                  >
                    {deletingPlanId === plan.plan_id ? <span className="spinner" /> : "Delete"}
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
