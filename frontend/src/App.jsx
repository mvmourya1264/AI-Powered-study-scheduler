import { useState } from "react";
import "./styles.css";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import TopicsReview from "./components/TopicsReview";
import ScheduleView from "./components/ScheduleView";

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
    </div>
  );
}
