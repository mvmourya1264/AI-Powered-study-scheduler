import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { removePlanFromProgress } from "../utils/progress";

const AppDataContext = createContext(null);

function latestPlanBySyllabus(plans) {
  const bySyllabus = {};
  for (const plan of plans) {
    const existing = bySyllabus[plan.syllabus_id];
    if (!existing || new Date(plan.created_at) > new Date(existing.created_at)) {
      bySyllabus[plan.syllabus_id] = plan;
    }
  }
  return bySyllabus;
}

export function AppDataProvider({ children }) {
  const [syllabi, setSyllabi] = useState([]);
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);

  const plansBySyllabus = useMemo(() => latestPlanBySyllabus(plans), [plans]);

  const refreshSyllabi = useCallback(async () => {
    const res = await api.listSyllabi();
    setSyllabi(res.data);
    return res.data;
  }, []);

  const refreshPlans = useCallback(async () => {
    const res = await api.listPlans();
    setPlans(res.data);
    return res.data;
  }, []);

  const refreshProgress = useCallback(async () => {
    const res = await api.getProgress();
    setProgress(res.data);
    return res.data;
  }, []);

  const refreshAll = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const [syllabiData, plansData, progressData] = await Promise.all([
        api.listSyllabi(),
        api.listPlans(),
        api.getProgress(),
      ]);
      if (seq !== loadSeq.current) return;
      setSyllabi(syllabiData.data);
      setPlans(plansData.data);
      setProgress(progressData.data);
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const addSyllabus = useCallback((syllabus) => {
    setSyllabi((prev) => [syllabus, ...prev]);
  }, []);

  const addPlan = useCallback((plan) => {
    setPlans((prev) => [plan, ...prev]);
    refreshProgress();
  }, [refreshProgress]);

  const deleteSyllabus = useCallback(
    async (id) => {
      await api.deleteSyllabus(id);
      setSyllabi((prev) => prev.filter((s) => s.id !== id));
      setPlans((prev) => prev.filter((p) => p.syllabus_id !== id));
      await refreshProgress();
    },
    [refreshProgress]
  );

  const deletePlan = useCallback(async (planId) => {
    await api.deletePlan(planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    setProgress((prev) => (prev ? removePlanFromProgress(prev, planId) : prev));
  }, []);

  const clearAll = useCallback(() => {
    setSyllabi([]);
    setPlans([]);
    setProgress(null);
  }, []);

  const value = {
    syllabi,
    plans,
    plansBySyllabus,
    progress,
    loading,
    refreshSyllabi,
    refreshPlans,
    refreshProgress,
    refreshAll,
    addSyllabus,
    addPlan,
    deleteSyllabus,
    deletePlan,
    clearAll,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
