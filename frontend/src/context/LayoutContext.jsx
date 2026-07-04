import { createContext, useContext, useState } from "react";

const LayoutContext = createContext(null);

export function LayoutProvider({ children, openCalendar, closeMobileNav }) {
  const [toast, setToast] = useState("");

  function showComingSoon() {
    setToast("Coming soon");
    setTimeout(() => setToast(""), 2000);
  }

  function openCalendarAndCloseNav() {
    closeMobileNav?.();
    openCalendar();
  }

  return (
    <LayoutContext.Provider
      value={{ openCalendar: openCalendarAndCloseNav, showComingSoon, toast, closeMobileNav }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
