import { createContext, useContext, useState } from "react";

const LayoutContext = createContext(null);

export function LayoutProvider({ children, openCalendar }) {
  const [toast, setToast] = useState("");

  function showComingSoon() {
    setToast("Coming soon");
    setTimeout(() => setToast(""), 2000);
  }

  return (
    <LayoutContext.Provider value={{ openCalendar, showComingSoon, toast }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
