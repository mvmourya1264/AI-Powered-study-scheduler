import { useState } from "react";
import { Outlet } from "react-router-dom";
import ActivityCalendar from "./ActivityCalendar";
import Sidebar from "./Sidebar";
import { LayoutProvider } from "../context/LayoutContext";

function MobileHeader({ onOpenMenu }) {
  return (
    <header className="mobile-header">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="mobile-header-brand">
        study<span className="brand-mark">.</span>plan
      </div>
    </header>
  );
}

export default function Layout() {
  const [activityOpen, setActivityOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <LayoutProvider
      openCalendar={() => setActivityOpen(true)}
      closeMobileNav={closeMobileNav}
    >
      <div className="app-shell app-shell-sidebar">
        <MobileHeader onOpenMenu={() => setMobileNavOpen(true)} />
        <div
          className={`sidebar-backdrop${mobileNavOpen ? " open" : ""}`}
          onClick={closeMobileNav}
          aria-hidden="true"
        />
        <Sidebar open={mobileNavOpen} onClose={closeMobileNav} />
        <div className="app-main-area">
          <Outlet />
        </div>
        <ActivityCalendar open={activityOpen} onClose={() => setActivityOpen(false)} />
      </div>
    </LayoutProvider>
  );
}
