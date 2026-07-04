import { useCallback, useEffect, useRef, useState } from "react";

const MODES = {
  pomodoro: { label: "Pomodoro", seconds: 25 * 60 },
  short: { label: "Short break", seconds: 5 * 60 },
  long: { label: "Long break", seconds: 15 * 60 },
};

const RING_SIZE = 200;
const STROKE = 8;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadSessionCount() {
  try {
    const raw = localStorage.getItem(`pomodoro-sessions-${todayKey()}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveSessionCount(count) {
  try {
    localStorage.setItem(`pomodoro-sessions-${todayKey()}`, String(count));
  } catch {
    /* ignore */
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState("pomodoro");
  const [secondsLeft, setSecondsLeft] = useState(MODES.pomodoro.seconds);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(loadSessionCount);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState("");
  const intervalRef = useRef(null);

  const totalSeconds = MODES[mode].seconds;
  const progress = secondsLeft / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const notifyComplete = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
    setToast("Pomodoro complete — nice work!");
    setTimeout(() => setToast(""), 3000);

    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        new Notification("Pomodoro complete!", { body: "Time for a break." });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("Pomodoro complete!", { body: "Time for a break." });
          }
        });
      }
    }
  }, []);

  const incrementSessions = useCallback(() => {
    setSessionsToday((prev) => {
      const next = prev + 1;
      saveSessionCount(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running) {
      stopInterval();
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopInterval();
          setRunning(false);
          if (mode === "pomodoro") {
            incrementSessions();
            notifyComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopInterval;
  }, [running, mode, stopInterval, incrementSessions, notifyComplete]);

  useEffect(() => () => stopInterval(), [stopInterval]);

  function switchMode(nextMode) {
    stopInterval();
    setRunning(false);
    setMode(nextMode);
    setSecondsLeft(MODES[nextMode].seconds);
  }

  function handleStartPause() {
    if (secondsLeft === 0) {
      setSecondsLeft(MODES[mode].seconds);
    }
    setRunning((r) => !r);
  }

  function handleReset() {
    stopInterval();
    setRunning(false);
    setSecondsLeft(MODES[mode].seconds);
  }

  return (
    <div className={`pomodoro-timer${flash ? " pomodoro-flash" : ""}`}>
      <h3>Pomodoro</h3>

      <div className="pomodoro-modes">
        {Object.entries(MODES).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            className={`btn ghost pomodoro-mode-btn${mode === key ? " active" : ""}`}
            onClick={() => switchMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pomodoro-ring-wrap">
        <svg width={RING_SIZE} height={RING_SIZE} className="pomodoro-ring">
          <circle
            className="pomodoro-ring-track"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
          />
          <circle
            className="pomodoro-ring-progress"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <div className="pomodoro-time">{formatTime(secondsLeft)}</div>
      </div>

      <div className="pomodoro-controls">
        <button type="button" className="btn" onClick={handleStartPause}>
          {running ? "Pause" : "Start"}
        </button>
        <button type="button" className="btn secondary" onClick={handleReset}>
          Reset
        </button>
      </div>

      <p className="pomodoro-sessions topic-meta">
        {sessionsToday} session{sessionsToday === 1 ? "" : "s"} today
      </p>

      {toast && <div className="pomodoro-toast">{toast}</div>}
    </div>
  );
}
