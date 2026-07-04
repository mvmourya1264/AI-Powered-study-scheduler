import { NavLink } from "react-router-dom";
import { useLayout } from "../context/LayoutContext";

function NavIcon({ children }) {
  return (
    <span className="sidebar-nav-icon" aria-hidden="true">
      {children}
    </span>
  );
}

const COMING_SOON = [
  { label: "Subjects", icon: "subjects" },
  { label: "Tasks", icon: "tasks" },
  { label: "Pomodoro", icon: "pomodoro" },
  { label: "Notes", icon: "notes" },
  { label: "Goals", icon: "goals" },
  { label: "Habit Tracker", icon: "habit" },
  { label: "Analytics", icon: "analytics" },
  { label: "Exams", icon: "exams" },
];

function iconPaths(name) {
  switch (name) {
    case "dashboard":
      return <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />;
    case "schedule":
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
        </>
      );
    case "subjects":
      return <path d="M4 6h16M4 12h16M4 18h10" />;
    case "tasks":
      return <path d="M9 11l3 3L20 6M4 6h4M4 12h4M4 18h4" />;
    case "pomodoro":
      return (
        <>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9V13l3 2M12 5V3M9 3h6" />
        </>
      );
    case "notes":
      return (
        <>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </>
      );
    case "goals":
      return <path d="M12 3l2.4 4.8L20 9l-4 3.9.9 5.5L12 16.5 7.1 18.5 8 12.9 4 9l5.6-1.2z" />;
    case "habit":
      return <path d="M4 12c2-4 6-6 8-6s6 2 8 6M4 12c2 4 6 6 8 6s6-2 8-6" />;
    case "analytics":
      return <path d="M5 19V9M12 19V5M19 19v-6" />;
    case "exams":
      return (
        <>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6" />
        </>
      );
    default:
      return null;
  }
}

function SidebarIcon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      {iconPaths(name)}
    </svg>
  );
}

export default function Sidebar() {
  const { openCalendar, showComingSoon, toast } = useLayout();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        study<span className="brand-mark">.</span>plan
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`} end>
          <NavIcon><SidebarIcon name="dashboard" /></NavIcon>
          Dashboard
        </NavLink>
        <button type="button" className="sidebar-nav-item" onClick={openCalendar}>
          <NavIcon><SidebarIcon name="schedule" /></NavIcon>
          Schedule
        </button>
        <NavLink to="/profile" className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}>
          <NavIcon><SidebarIcon name="profile" /></NavIcon>
          Profile
        </NavLink>
      </nav>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav sidebar-nav-muted">
        {COMING_SOON.map((item) => (
          <button
            key={item.label}
            type="button"
            className="sidebar-nav-item disabled"
            onClick={showComingSoon}
          >
            <NavIcon><SidebarIcon name={item.icon} /></NavIcon>
            <span className="sidebar-nav-label">{item.label}</span>
            <span className="sidebar-soon-badge">Soon</span>
          </button>
        ))}
      </nav>

      {toast && <div className="sidebar-toast">{toast}</div>}
    </aside>
  );
}
