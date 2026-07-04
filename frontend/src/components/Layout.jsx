import { useState } from "react";
import { Outlet } from "react-router-dom";
import ActivityCalendar from "./ActivityCalendar";
import Sidebar from "./Sidebar";
import { LayoutProvider } from "../context/LayoutContext";

export default function Layout() {
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <LayoutProvider openCalendar={() => setActivityOpen(true)}>
      <div className="app-shell app-shell-sidebar">
        <Sidebar />
        <div className="app-main-area">
          <Outlet />
        </div>
        <ActivityCalendar open={activityOpen} onClose={() => setActivityOpen(false)} />
      </div>
    </LayoutProvider>
  );
}
