import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ActivityCalendar, { CalendarIcon } from "./ActivityCalendar";

function UserIcon() {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
    </svg>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <div className="app-shell">
      <div className="topbar">
        <button
          className="brand"
          style={{ background: "none", border: "none", padding: 0 }}
          onClick={() => navigate("/dashboard")}
        >
          study<span className="brand-mark">.</span>plan
        </button>
        <div className="topbar-actions">
          <button
            className="btn ghost topbar-icon-btn"
            onClick={() => setActivityOpen(true)}
            aria-label="Activity calendar"
          >
            <CalendarIcon />
          </button>
          <button
            className="btn ghost topbar-icon-btn"
            onClick={() => navigate("/profile")}
            aria-label="Profile"
          >
            <UserIcon />
          </button>
        </div>
      </div>
      <Outlet />
      <ActivityCalendar open={activityOpen} onClose={() => setActivityOpen(false)} />
    </div>
  );
}
