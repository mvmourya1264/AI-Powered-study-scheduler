import { useState } from "react";
import "./styles.css";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import TopicsReview from "./components/TopicsReview";
import ScheduleView from "./components/ScheduleView";
import Profile from "./components/Profile";

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

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));
  const [view, setView] = useState({ name: "dashboard" });

  function logout() {
    localStorage.removeItem("token");
    setAuthed(false);
    setView({ name: "dashboard" });
  }

  if (!authed) {
    return <Auth onAuthed={() => setAuthed(true)} />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <button
          className="brand"
          style={{ background: "none", border: "none", padding: 0 }}
          onClick={() => setView({ name: "dashboard" })}
        >
          study<span className="brand-mark">.</span>plan
        </button>
        <div className="topbar-actions">
          <button
            className="btn ghost topbar-icon-btn"
            onClick={() => setView({ name: "profile" })}
            aria-label="Profile"
          >
            <UserIcon />
          </button>
        </div>
      </div>

      {view.name === "dashboard" && (
        <Dashboard
          onSelectSyllabus={(syllabusId, planId) =>
            planId
              ? setView({ name: "schedule", planId })
              : setView({ name: "topics", syllabusId })
          }
        />
      )}

      {view.name === "topics" && (
        <TopicsReview
          syllabusId={view.syllabusId}
          onBack={() => setView({ name: "dashboard" })}
          onPlanCreated={(planId) => setView({ name: "schedule", planId })}
        />
      )}

      {view.name === "schedule" && (
        <ScheduleView
          planId={view.planId}
          onBack={() => setView({ name: "dashboard" })}
        />
      )}

      {view.name === "profile" && (
        <Profile
          onBack={() => setView({ name: "dashboard" })}
          onOpenPlan={(planId) => setView({ name: "schedule", planId })}
          onSignOut={logout}
          onEmailChanged={() => {
            alert("Email updated — please sign in again with your new email.");
            logout();
          }}
        />
      )}
    </div>
  );
}
