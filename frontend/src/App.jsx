import { useState } from "react";
import "./styles.css";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import TopicsReview from "./components/TopicsReview";
import ScheduleView from "./components/ScheduleView";
import ProfileSettings from "./components/ProfileSettings";
import ProgressView from "./components/ProgressView";

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
          <button className="btn ghost" onClick={() => setView({ name: "progress" })}>
            Progress
          </button>
          <button className="btn ghost" onClick={() => setView({ name: "profile" })}>
            Profile
          </button>
          <button className="btn ghost" onClick={logout}>
            Sign out
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
        <ProfileSettings
          onBack={() => setView({ name: "dashboard" })}
          onEmailChanged={() => {
            alert("Email updated — please sign in again with your new email.");
            logout();
          }}
        />
      )}

      {view.name === "progress" && (
        <ProgressView
          onBack={() => setView({ name: "dashboard" })}
          onOpenPlan={(planId) => setView({ name: "schedule", planId })}
        />
      )}
    </div>
  );
}
