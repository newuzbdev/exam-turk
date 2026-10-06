export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export type PomodoroSound = string;

export type PomodoroDurations = Record<PomodoroMode, number>;

/** Minutes shown in the three timer modes. */
export const defaultPomodoroDurations: PomodoroDurations = Object.freeze({
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
});

export const defaultPomodoroPeriodCount = 4;

export type PomodoroSnapshot = {
  version: 4;
  mode: PomodoroMode;
  durations: PomodoroDurations;
  /** Number of focus intervals in this session. */
  periodCount: number;
  /** Number of focus intervals already completed in this session. */
  completedFocuses: number;
  /** True only after the final long break ends. */
  finished: boolean;
  sound: PomodoroSound;
  volume: number;
  started: boolean;
  running: boolean;
  /** Remaining time in the current interval only. */
  remainingSeconds: number;
  savedAt: number;
};

export type PomodoroInterval = {
  mode: PomodoroMode;
  focusNumber: number;
  durationSeconds: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clampInteger = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

function restoreDurations(value: unknown): PomodoroDurations | null {
  if (value === undefined) return { ...defaultPomodoroDurations };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<PomodoroDurations>;
  if (!isFiniteNumber(candidate.focus)
    || !isFiniteNumber(candidate.shortBreak)
    || !isFiniteNumber(candidate.longBreak)) return null;
  return {
    focus: clampInteger(candidate.focus, 1, 180),
    shortBreak: clampInteger(candidate.shortBreak, 1, 60),
    longBreak: clampInteger(candidate.longBreak, 1, 60),
  };
}

const isMode = (value: unknown): value is PomodoroMode =>
  value === "focus" || value === "shortBreak" || value === "longBreak";

const isSound = (value: unknown): value is PomodoroSound =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 120;

export function pomodoroSeconds(
  mode: PomodoroMode,
  durations: PomodoroDurations = defaultPomodoroDurations,
): number {
  return durations[mode] * 60;
}

/** A period means one focus interval; rests are inserted between periods and at the end. */
export function buildPomodoroTimeline(
  periodCount: number,
  durations: PomodoroDurations = defaultPomodoroDurations,
): PomodoroInterval[] {
  if (!Number.isInteger(periodCount) || periodCount < 1 || periodCount > 12) {
    throw new RangeError("Pomodoro period count must be between 1 and 12");
  }
  const normalized = restoreDurations(durations);
  if (!normalized) throw new RangeError("Pomodoro durations must be finite numbers");
  const intervals: PomodoroInterval[] = [];
  for (let focusNumber = 1; focusNumber <= periodCount; focusNumber += 1) {
    intervals.push({ mode: "focus", focusNumber, durationSeconds: pomodoroSeconds("focus", normalized) });
    const mode = focusNumber === periodCount ? "longBreak" : "shortBreak";
    intervals.push({ mode, focusNumber, durationSeconds: pomodoroSeconds(mode, normalized) });
  }
  return intervals;
}

export function nextPomodoroStep(
  mode: PomodoroMode,
  completedFocuses: number,
  periodCount = defaultPomodoroPeriodCount,
): Pick<PomodoroSnapshot, "mode" | "completedFocuses" | "finished"> {
  const count = clampInteger(completedFocuses, 0, periodCount);
  if (mode === "focus") {
    const nextCount = Math.min(periodCount, count + 1);
    return {
      mode: nextCount === periodCount ? "longBreak" : "shortBreak",
      completedFocuses: nextCount,
      finished: false,
    };
  }
  if (mode === "longBreak" && count === periodCount) {
    return { mode: "longBreak", completedFocuses: count, finished: true };
  }
  return { mode: "focus", completedFocuses: count, finished: false };
}

/** Restore a session, advancing through every interval elapsed while the page was away. */
export function restorePomodoroSnapshot(value: unknown, now = Date.now()): PomodoroSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || !isFiniteNumber(now) || now < 0) return null;

  const candidate = value as Omit<Partial<PomodoroSnapshot>, "version"> & { version?: number };
  if ((candidate.version !== 3 && candidate.version !== 4)
    || !isMode(candidate.mode)
    || !isFiniteNumber(candidate.completedFocuses)
    || !isSound(candidate.sound)
    || !isFiniteNumber(candidate.volume)
    || typeof candidate.started !== "boolean"
    || typeof candidate.running !== "boolean"
    || (candidate.running && !candidate.started)
    || !isFiniteNumber(candidate.remainingSeconds)
    || !isFiniteNumber(candidate.savedAt)
    || candidate.savedAt < 0) return null;
  const legacy = candidate.version === 3;
  if (!legacy && (!isFiniteNumber(candidate.periodCount) || typeof candidate.finished !== "boolean")) return null;
  const durations = restoreDurations(candidate.durations);
  if (!durations) return null;
  const periodCount = legacy
    ? defaultPomodoroPeriodCount
    : clampInteger(candidate.periodCount!, 1, 12);
  const volume = Math.min(1, Math.max(0, candidate.volume));
  const base = {
    version: 4 as const,
    durations,
    periodCount,
    sound: candidate.sound,
    volume,
    savedAt: now,
  };
  let mode = candidate.mode;
  let completedFocuses = clampInteger(candidate.completedFocuses, 0, periodCount);
  // Version 3 reset the count upon entering its fourth, long break.
  if (legacy && mode === "longBreak") completedFocuses = periodCount;
  if (!legacy && candidate.finished) {
    return {
      ...base, mode: "longBreak", completedFocuses: periodCount,
      finished: true, started: false, running: false, remainingSeconds: 0,
    };
  }

  let remainingSeconds = Math.min(
    pomodoroSeconds(mode, durations),
    Math.max(0, Math.ceil(candidate.remainingSeconds)),
  );
  if (!candidate.started) remainingSeconds = pomodoroSeconds(mode, durations);
  let elapsedSeconds = candidate.running
    ? Math.max(0, Math.floor((now - candidate.savedAt) / 1000))
    : 0;

  if (candidate.started) {
    while (elapsedSeconds >= remainingSeconds) {
      elapsedSeconds -= remainingSeconds;
      const next = nextPomodoroStep(mode, completedFocuses, periodCount);
      mode = next.mode;
      completedFocuses = next.completedFocuses;
      if (next.finished) {
        return {
          ...base, mode, completedFocuses,
          finished: true, started: false, running: false, remainingSeconds: 0,
        };
      }
      remainingSeconds = pomodoroSeconds(mode, durations);
      if (!candidate.running) {
        return {
          ...base, mode, completedFocuses,
          finished: false, started: false, running: false, remainingSeconds,
        };
      }
    }
    remainingSeconds -= elapsedSeconds;
  }

  return {
    ...base, mode, completedFocuses,
    finished: false,
    started: candidate.started,
    running: candidate.running,
    remainingSeconds,
  };
}
