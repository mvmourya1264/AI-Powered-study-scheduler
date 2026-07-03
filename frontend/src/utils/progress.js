function round1(n) {
  return Math.round(n * 10) / 10;
}

export function removePlanFromProgress(progress, planId) {
  const removed = progress.plans.find((p) => p.plan_id === planId);
  if (!removed) return progress;

  const plans = progress.plans.filter((p) => p.plan_id !== planId);
  const total_sessions = progress.total_sessions - removed.total_sessions;
  const completed_sessions = progress.completed_sessions - removed.completed_sessions;
  const total_hours = round1(progress.total_hours - removed.total_hours);
  const completed_hours = round1(progress.completed_hours - removed.completed_hours);

  return {
    total_plans: plans.length,
    total_sessions,
    completed_sessions,
    total_hours,
    completed_hours,
    percent_complete:
      total_sessions === 0 ? 0 : round1((completed_sessions / total_sessions) * 100),
    plans,
  };
}
