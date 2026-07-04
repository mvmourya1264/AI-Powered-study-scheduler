import { useCallback, useEffect, useRef, useState } from "react";

const MODE_LABELS = {
  pomodoro: "Pomodoro",
  short: "Short break",
  long: "Long break",
};

const DEFAULT_DURATIONS = {
  pomodoro: 25,
  short: 5,
  long: 15,
};

const DURATIONS_KEY = "pomodoro-durations";

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

function loadDurations() {
  try {
    const raw = localStorage.getItem(DURATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pomodoro: clampMinutes(parsed.pomodoro ?? DEFAULT_DURATIONS.pomodoro),
        short: clampMinutes(parsed.short ?? DEFAULT_DURATIONS.short),
        long: clampMinutes(parsed.long ?? DEFAULT_DURATIONS.long),
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_DURATIONS };
}

function saveDurations(durations) {
  try {
    localStorage.setItem(DURATIONS_KEY, JSON.stringify(durations));
  } catch {
    /* ignore */
  }
}

function clearDurations() {
  try {
    localStorage.removeItem(DURATIONS_KEY);
  } catch {
    /* ignore */
  }
}

function clampMinutes(value) {
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n)) return DEFAULT_DURATIONS.pomodoro;
  return Math.min(120, Math.max(1, n));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PomodoroTimer() {
  const [durations, setDurations] = useState(loadDurations);
  const [mode, setMode] = useState("pomodoro");
  const [secondsLeft, setSecondsLeft] = useState(() => loadDurations().pomodoro * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(loadSessionCount);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const intervalRef = useRef(null);

  const totalSeconds = durations[mode] * 60;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
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

  function applyDuration(modeKey, minutes) {
    const clamped = clampMinutes(minutes);
    setDurations((prev) => {
      const next = { ...prev, [modeKey]: clamped };
      saveDurations(next);
      return next;
    });
    if (modeKey === mode) {
      stopInterval();
      setRunning(false);
      setSecondsLeft(clamped * 60);
    }
  }

  function switchMode(nextMode) {
    stopInterval();
    setRunning(false);
    setMode(nextMode);
    setSecondsLeft(durations[nextMode] * 60);
  }

  function handleStartPause() {
    if (secondsLeft === 0) {
      setSecondsLeft(durations[mode] * 60);
    }
    setRunning((r) => !r);
  }

  function handleReset() {
    stopInterval();
    setRunning(false);
    setSecondsLeft(durations[mode] * 60);
  }

  function handleResetDefaults() {
    clearDurations();
    const defaults = { ...DEFAULT_DURATIONS };
    setDurations(defaults);
    stopInterval();
    setRunning(false);
    setSecondsLeft(defaults[mode] * 60);
  }

  return (
    <div className={`pomodoro-timer${flash ? " pomodoro-flash" : ""}`}>
      <div className="pomodoro-modes">
        {Object.entries(MODE_LABELS).map(([key, label]) => (
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

      <div className="pomodoro-settings">
        <button
          type="button"
          className="btn ghost pomodoro-customize-btn"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          {settingsOpen ? "Hide customize" : "Customize durations"}
        </button>
        {settingsOpen && (
          <div className="pomodoro-settings-panel">
            {Object.entries(MODE_LABELS).map(([key, label]) => (
              <div className="field pomodoro-duration-field" key={key}>
                <label htmlFor={`duration-${key}`}>{label} (min)</label>
                <input
                  id={`duration-${key}`}
                  type="number"
                  min={1}
                  max={120}
                  value={durations[key]}
                  onChange={(e) => applyDuration(key, e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="btn secondary" onClick={handleResetDefaults}>
              Reset to defaults
            </button>
          </div>
        )}
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
