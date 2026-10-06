export type FocusTimerPhase = "focus" | "break";

export type FocusSessionSnapshot = {
  version: 1;
  duration: number;
  breakDuration: number;
  phase: FocusTimerPhase;
  sound: string;
  audioEnabled?: boolean;
  volume: number;
  started: boolean;
  running: boolean;
  remainingSeconds: number;
  audioOffsetSeconds: number;
  savedAt: number;
};

const clampInteger = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

export function resolveFocusSession(
  snapshot: FocusSessionSnapshot,
  now = Date.now(),
): FocusSessionSnapshot {
  const duration = clampInteger(snapshot.duration, 1, 180);
  const breakDuration = clampInteger(snapshot.breakDuration, 1, 60);
  const remainingSeconds = Math.max(0, Math.round(snapshot.remainingSeconds));
  const elapsedSeconds = snapshot.running
    ? Math.max(0, Math.floor((now - snapshot.savedAt) / 1000))
    : 0;

  if (!snapshot.started || !snapshot.running) {
    return {
      ...snapshot,
      duration,
      breakDuration,
      remainingSeconds,
      audioOffsetSeconds: Math.max(0, snapshot.audioOffsetSeconds),
      savedAt: now,
    };
  }

  if (elapsedSeconds < remainingSeconds) {
    return {
      ...snapshot,
      duration,
      breakDuration,
      remainingSeconds: remainingSeconds - elapsedSeconds,
      audioOffsetSeconds: snapshot.phase === "focus"
        ? Math.max(0, snapshot.audioOffsetSeconds + elapsedSeconds)
        : 0,
      savedAt: now,
    };
  }

  if (snapshot.phase === "focus") {
    const elapsedBreakSeconds = elapsedSeconds - remainingSeconds;
    const fullBreakSeconds = breakDuration * 60;
    if (elapsedBreakSeconds < fullBreakSeconds) {
      return {
        ...snapshot,
        duration,
        breakDuration,
        phase: "break",
        remainingSeconds: fullBreakSeconds - elapsedBreakSeconds,
        audioOffsetSeconds: Math.max(0, snapshot.audioOffsetSeconds + remainingSeconds),
        savedAt: now,
      };
    }
  }

  return {
    ...snapshot,
    duration,
    breakDuration,
    phase: "focus",
    started: false,
    running: false,
    remainingSeconds: duration * 60,
    audioOffsetSeconds: 0,
    savedAt: now,
  };
}

export function isFocusSessionSnapshot(value: unknown): value is FocusSessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FocusSessionSnapshot>;
  return candidate.version === 1
    && typeof candidate.duration === "number"
    && typeof candidate.breakDuration === "number"
    && (candidate.phase === "focus" || candidate.phase === "break")
    && typeof candidate.sound === "string"
    && (candidate.audioEnabled === undefined || typeof candidate.audioEnabled === "boolean")
    && typeof candidate.volume === "number"
    && typeof candidate.started === "boolean"
    && typeof candidate.running === "boolean"
    && typeof candidate.remainingSeconds === "number"
    && typeof candidate.audioOffsetSeconds === "number"
    && typeof candidate.savedAt === "number";
}

export type FocusPlanSnapshot = {
  version: 2;
  duration: number;
  breakDuration: number;
  totalDuration: number;
  sound: string;
  audioEnabled?: boolean;
  volume: number;
  started: boolean;
  running: boolean;
  /** Remaining time in the whole plan, including breaks. */
  remainingSeconds: number;
  audioOffsetSeconds: number;
  savedAt: number;
};

export type FocusPlanPeriod = {
  phase: FocusTimerPhase;
  startSeconds: number;
  durationSeconds: number;
};

const isFiniteInRange = (value: unknown, minimum: number, maximum = Infinity): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;

export function buildFocusPlan(
  duration: number,
  breakDuration: number,
  totalDuration: number,
): FocusPlanPeriod[] {
  if (!isFiniteInRange(duration, 1, 180) || !isFiniteInRange(breakDuration, 1, 60)
    || !isFiniteInRange(totalDuration, 1, 480)) {
    throw new RangeError("Focus plan durations are outside their allowed range");
  }
  const totalSeconds = Math.round(totalDuration * 60);
  const periods: FocusPlanPeriod[] = [];
  let startSeconds = 0;
  let phase: FocusTimerPhase = "focus";
  while (startSeconds < totalSeconds) {
    const durationSeconds = Math.min(
      Math.round((phase === "focus" ? duration : breakDuration) * 60),
      totalSeconds - startSeconds,
    );
    periods.push({ phase, startSeconds, durationSeconds });
    startSeconds += durationSeconds;
    phase = phase === "focus" ? "break" : "focus";
  }
  return periods;
}

export function getFocusPlanProgress(
  duration: number,
  breakDuration: number,
  totalDuration: number,
  remainingSeconds: number,
) {
  const periods = buildFocusPlan(duration, breakDuration, totalDuration);
  const totalSeconds = Math.round(totalDuration * 60);
  if (!Number.isFinite(remainingSeconds)) throw new RangeError("Remaining time must be finite");
  const remaining = Math.min(totalSeconds, Math.max(0, Math.ceil(remainingSeconds)));
  const elapsedSeconds = totalSeconds - remaining;
  const completed = remaining === 0;
  const periodIndex = completed ? periods.length - 1 : periods.findIndex(
    (period) => elapsedSeconds < period.startSeconds + period.durationSeconds,
  );
  const period = periods[periodIndex];
  return {
    periods,
    periodIndex,
    phase: period.phase,
    phaseRemainingSeconds: completed ? 0 : period.startSeconds + period.durationSeconds - elapsedSeconds,
    elapsedSeconds,
    totalSeconds,
    completed,
  };
}

/** Restore a plan from storage, counting only focus periods toward music progress. */
export function restoreFocusPlanSession(value: unknown, now = Date.now()): FocusPlanSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !isFiniteInRange(now, 0)) return null;
  const candidate = value as Omit<Partial<FocusPlanSnapshot>, "version"> & { version?: number; phase?: unknown };
  if (!isFiniteInRange(candidate.duration, 1, 180)
    || !isFiniteInRange(candidate.breakDuration, 1, 60)
    || typeof candidate.sound !== "string"
    || (candidate.audioEnabled !== undefined && typeof candidate.audioEnabled !== "boolean")
    || !isFiniteInRange(candidate.volume, 0, 1)
    || typeof candidate.started !== "boolean"
    || typeof candidate.running !== "boolean"
    || (candidate.running && !candidate.started)
    || !isFiniteInRange(candidate.remainingSeconds, 0)
    || !isFiniteInRange(candidate.audioOffsetSeconds, 0)
    || !isFiniteInRange(candidate.savedAt, 0)) return null;

  if (candidate.version === 1) {
    if (!isFocusSessionSnapshot(value)) return null;
    const restored = resolveFocusSession(value, now);
    const totalDuration = restored.duration + restored.breakDuration;
    const remainingSeconds = !restored.started
      ? totalDuration * 60
      : restored.phase === "focus"
        ? restored.remainingSeconds + restored.breakDuration * 60
        : restored.remainingSeconds;
    return {
      version: 2,
      duration: restored.duration,
      breakDuration: restored.breakDuration,
      totalDuration,
      sound: restored.sound,
      audioEnabled: restored.audioEnabled,
      volume: restored.volume,
      started: restored.started,
      running: restored.running,
      remainingSeconds: Math.min(totalDuration * 60, remainingSeconds),
      audioOffsetSeconds: restored.audioOffsetSeconds,
      savedAt: now,
    };
  }

  if (candidate.version !== 2 || !isFiniteInRange(candidate.totalDuration, 1, 480)
    || candidate.remainingSeconds > Math.round(candidate.totalDuration * 60)) return null;

  const snapshot = candidate as FocusPlanSnapshot;
  const progress = getFocusPlanProgress(snapshot.duration, snapshot.breakDuration, snapshot.totalDuration, snapshot.remainingSeconds);
  const elapsedSinceSave = snapshot.started && snapshot.running
    ? Math.max(0, Math.floor((now - snapshot.savedAt) / 1000)) : 0;
  const remainingSeconds = Math.max(0, progress.totalSeconds - progress.elapsedSeconds - elapsedSinceSave);
  const elapsedEnd = progress.totalSeconds - remainingSeconds;
  const elapsedFocusSeconds = progress.periods.reduce((sum, period) => period.phase === "focus"
    ? sum + Math.max(0, Math.min(elapsedEnd, period.startSeconds + period.durationSeconds)
      - Math.max(progress.elapsedSeconds, period.startSeconds))
    : sum, 0);
  return {
    version: 2,
    duration: snapshot.duration,
    breakDuration: snapshot.breakDuration,
    totalDuration: snapshot.totalDuration,
    sound: snapshot.sound,
    audioEnabled: snapshot.audioEnabled,
    volume: snapshot.volume,
    started: snapshot.started || remainingSeconds === 0,
    running: snapshot.running && remainingSeconds > 0,
    remainingSeconds,
    audioOffsetSeconds: snapshot.audioOffsetSeconds + elapsedFocusSeconds,
    savedAt: now,
  };
}
