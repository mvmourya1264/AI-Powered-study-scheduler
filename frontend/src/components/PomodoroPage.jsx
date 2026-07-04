import PomodoroTimer from "./PomodoroTimer";

export default function PomodoroPage() {
  return (
    <div className="main">
      <div className="eyebrow">Focus</div>
      <h1>Pomodoro Timer</h1>
      <p>Stay focused with timed work sessions.</p>

      <div className="card pomodoro-page-card">
        <div className="pomodoro-page-inner">
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
