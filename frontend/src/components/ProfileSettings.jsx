import { useEffect, useState } from "react";
import { api } from "../api";

export default function ProfileSettings({ onBack, onEmailChanged }) {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.getProfile();
      setProfile(res.data);
      setFullName(res.data.full_name || "");
      setEmail(res.data.email);
    } catch {
      setError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
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
      setSuccess("No changes to save.");
      setSaving(false);
      return;
    }

    try {
      const res = await api.updateProfile(patch);
      setProfile(res.data);
      setFullName(res.data.full_name || "");
      setEmail(res.data.email);

      if (patch.email) {
        onEmailChanged?.();
        return;
      }

      setSuccess("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update profile.");
    } finally {
      setSaving(false);
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
      <button className="btn ghost" onClick={onBack} style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← Back
      </button>
      <div className="eyebrow">Account</div>
      <h1>Profile settings</h1>
      <p>Update your name and email address.</p>

      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
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
        {profile?.created_at && (
          <div className="topic-meta" style={{ marginBottom: 16 }}>
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </div>
        )}
        {error && <div className="error-msg">{error}</div>}
        {success && (
          <div className="success-msg" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? <span className="spinner" /> : "Save changes"}
        </button>
      </form>
    </div>
  );
}
