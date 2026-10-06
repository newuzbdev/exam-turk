import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Howl } from "howler";
import { Clock3, Pause, Play, RotateCcw, Settings2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getFocusPlanProgress, restoreFocusPlanSession } from "@/lib/focus-session";
import {
  buildPomodoroTimeline,
  defaultPomodoroDurations,
  defaultPomodoroPeriodCount,
  nextPomodoroStep,
  pomodoroSeconds,
  restorePomodoroSnapshot,
  type PomodoroDurations,
  type PomodoroMode,
  type PomodoroSnapshot,
} from "@/lib/focus-pomodoro-session";
import { FocusDurationSettings } from "./focus-duration-settings";
import { FocusSoundLibrary, FocusSoundPlayer } from "./focus-sound-picker";
import { FocusTimeline } from "./focus-timeline";
import { FocusTimerMenu } from "./focus-timer-menu";

const storageKey = "turkishmock:focus-session:v1";
type SoundChoice = { label: string; src: string; group: "Lo-fi" | "Ortam" | "Klasik"; gain: number };
const sounds: SoundChoice[] = [
  { label: "Yumuşak Ritim", src: "/audio/focus/lofi/yumusak-ritim.m4a", group: "Lo-fi", gain: 0.8 },
  { label: "Sakin Akıntılar", src: "/audio/focus/lofi/holizna-calm-currents.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Baloncuklar", src: "/audio/focus/lofi/holizna-bubbles.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Teta Frekansı", src: "/audio/focus/lofi/holizna-theta-frequency.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Tokyo Gün Batımı", src: "/audio/focus/lofi/holizna-tokyo-sunset.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Huzurlu Sürükleniş", src: "/audio/focus/lofi/holizna-peaceful-drift.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Anımsamalar", src: "/audio/focus/lofi/holizna-reminders.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Unutmaya Övgü", src: "/audio/focus/lofi/holizna-ode-to-forgetting.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Sulak Alanlar", src: "/audio/focus/lofi/holizna-wetlands.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Düşsel Hayal", src: "/audio/focus/lofi/holizna-dreamy-reverie.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Geceye Geçiş", src: "/audio/focus/lofi/holizna-ease-into-night.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Sonsuz Yankılar", src: "/audio/focus/lofi/holizna-infinite-echoes.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Sisin İçine", src: "/audio/focus/lofi/holizna-into-the-mist.mp3", group: "Lo-fi", gain: 0.7 },
  { label: "Lo-fi · Sakin Piyano", src: "/audio/focus/lofi/oga-chill-lofi.mp3", group: "Lo-fi", gain: 0.75 },
  { label: "Lo-fi · Yumuşak Hip Hop", src: "/audio/focus/lofi/oga-lofi-hip-hop.ogg", group: "Lo-fi", gain: 0.75 },
  { label: "Lo-fi · Kısa Döngü", src: "/audio/focus/lofi/oga-lofi-hip-hop-loop.ogg", group: "Lo-fi", gain: 0.75 },
  { label: "Pencerede yağmur", src: "/audio/focus/rain/rain-on-window.mp3", group: "Ortam", gain: 0.28 },
  { label: "Çadırda yağmur", src: "/audio/focus/rain/rain-on-tent.mp3", group: "Ortam", gain: 0.9 },
  { label: "Şömine", src: "/audio/focus/nature/campfire.mp3", group: "Ortam", gain: 0.5 },
  { label: "Kafe", src: "/audio/focus/places/cafe.mp3", group: "Ortam", gain: 0.55 },
  { label: "Kütüphane", src: "/audio/focus/places/library.mp3", group: "Ortam", gain: 1 },
  { label: "Ofis", src: "/audio/focus/places/office.mp3", group: "Ortam", gain: 0.75 },
  { label: "Tren içi", src: "/audio/focus/transport/inside-a-train.mp3", group: "Ortam", gain: 0.58 },
  { label: "Uçak kabini", src: "/audio/focus/transport/airplane.mp3", group: "Ortam", gain: 0.9 },
  { label: "Saat", src: "/audio/focus/things/clock.mp3", group: "Ortam", gain: 1 },
  { label: "Vinil", src: "/audio/focus/things/vinyl-effect.mp3", group: "Ortam", gain: 0.95 },
  { label: "Bach · Başlangıç Aryası", src: "/audio/focus/baroque/aria.ogg", group: "Klasik", gain: 1 },
  { label: "Bach · 1. Varyasyon", src: "/audio/focus/baroque/variation-1.ogg", group: "Klasik", gain: 0.55 },
  { label: "Bach · 2. Varyasyon", src: "/audio/focus/baroque/variation-2.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · Ünison Kanon", src: "/audio/focus/baroque/canon-3.ogg", group: "Klasik", gain: 0.42 },
  { label: "Bach · 4. Varyasyon", src: "/audio/focus/baroque/variation-4.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 5. Varyasyon", src: "/audio/focus/baroque/variation-5.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 6. Varyasyon", src: "/audio/focus/baroque/variation-6.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 7. Varyasyon", src: "/audio/focus/baroque/variation-7.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 8. Varyasyon", src: "/audio/focus/baroque/variation-8.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 9. Varyasyon", src: "/audio/focus/baroque/variation-9.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 10. Varyasyon", src: "/audio/focus/baroque/variation-10.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 11. Varyasyon", src: "/audio/focus/baroque/variation-11.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 12. Varyasyon", src: "/audio/focus/baroque/variation-12.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 13. Varyasyon", src: "/audio/focus/baroque/variation-13.ogg", group: "Klasik", gain: 0.72 },
  { label: "Bach · 14. Varyasyon", src: "/audio/focus/baroque/variation-14.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · Beşli Kanon", src: "/audio/focus/baroque/variation-15.ogg", group: "Klasik", gain: 0.85 },
  { label: "Bach · 16. Varyasyon", src: "/audio/focus/baroque/variation-16.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 17. Varyasyon", src: "/audio/focus/baroque/variation-17.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 18. Varyasyon", src: "/audio/focus/baroque/variation-18.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 19. Varyasyon", src: "/audio/focus/baroque/variation-19.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 20. Varyasyon", src: "/audio/focus/baroque/variation-20.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · Yedili Kanon", src: "/audio/focus/baroque/variation-21.ogg", group: "Klasik", gain: 0.75 },
  { label: "Bach · 22. Varyasyon", src: "/audio/focus/baroque/variation-22.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 23. Varyasyon", src: "/audio/focus/baroque/variation-23.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 24. Varyasyon", src: "/audio/focus/baroque/variation-24.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · Adagio", src: "/audio/focus/baroque/variation-25.ogg", group: "Klasik", gain: 0.96 },
  { label: "Bach · 26. Varyasyon", src: "/audio/focus/baroque/variation-26.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 27. Varyasyon", src: "/audio/focus/baroque/variation-27.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 28. Varyasyon", src: "/audio/focus/baroque/variation-28.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 29. Varyasyon", src: "/audio/focus/baroque/variation-29.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · 30. Varyasyon", src: "/audio/focus/baroque/variation-30.ogg", group: "Klasik", gain: 0.7 },
  { label: "Bach · Kapanış Aryası", src: "/audio/focus/baroque/aria-da-capo.ogg", group: "Klasik", gain: 1 },
];
const soundSources = new Map(sounds.map((sound) => [sound.label, sound]));
const soundChoices = sounds.map(({ label, group }) => ({ label, group }));
const soundAliases: Record<string, string> = {
  "Lo-fi": "Yumuşak Ritim",
  "Yağmur": "Pencerede yağmur",
  "Klasik": "Bach · Başlangıç Aryası",
};
const normalizeSound = (sound: string) => sound === "Sessiz" ? sound
  : soundSources.has(sound) ? sound : soundAliases[sound] ?? "Sessiz";

const defaultSession = (): PomodoroSnapshot => ({
  version: 4,
  mode: "focus",
  durations: { ...defaultPomodoroDurations },
  periodCount: defaultPomodoroPeriodCount,
  completedFocuses: 0,
  finished: false,
  sound: "Sessiz",
  volume: 0.38,
  started: false,
  running: false,
  remainingSeconds: pomodoroSeconds("focus"),
  savedAt: Date.now(),
});

function readStoredSession(): PomodoroSnapshot {
  if (typeof window === "undefined") return defaultSession();
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    const current = restorePomodoroSnapshot(parsed);
    if (current) return { ...current, sound: normalizeSound(current.sound) };

    // Carry an earlier plan's current interval into the simpler Pomodoro timer.
    const old = restoreFocusPlanSession(parsed);
    if (!old) return defaultSession();
    const progress = getFocusPlanProgress(
      old.duration, old.breakDuration, old.totalDuration, old.remainingSeconds,
    );
    const finishedFocuses = progress.periods
      .slice(0, progress.completed ? progress.periods.length : progress.periodIndex)
      .filter((period) => period.phase === "focus").length;
    const completedFocuses = progress.completed ? 0 : Math.min(defaultPomodoroPeriodCount, finishedFocuses);
    const mode: PomodoroMode = progress.completed || progress.phase === "focus"
      ? "focus" : completedFocuses === defaultPomodoroPeriodCount ? "longBreak" : "shortBreak";
    const durations: PomodoroDurations = {
      focus: old.duration,
      shortBreak: old.breakDuration,
      longBreak: defaultPomodoroDurations.longBreak,
    };
    return {
      version: 4,
      mode,
      durations,
      periodCount: defaultPomodoroPeriodCount,
      completedFocuses,
      finished: false,
      sound: old.audioEnabled === false ? "Sessiz" : normalizeSound(old.sound),
      volume: old.volume,
      started: progress.completed ? false : old.started,
      running: progress.completed ? false : old.running,
      remainingSeconds: progress.completed
        ? pomodoroSeconds(mode, durations)
        : Math.min(pomodoroSeconds(mode, durations), progress.phaseRemainingSeconds),
      savedAt: Date.now(),
    };
  } catch {
    return defaultSession();
  }
}

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function FocusTimerPanel({
  open, onClose, onOpen, docks, collapsed = false,
}: {
  open: boolean; onClose: () => void; onOpen: () => void;
  docks: { sidebar: HTMLElement | null; mobile: HTMLElement | null };
  collapsed?: boolean;
}) {
  const [session, setSession] = useState(readStoredSession);
  // A restored selection stays quiet until the listener explicitly starts it.
  const [audioPaused, setAudioPaused] = useState(true);
  const [panel, setPanel] = useState<"image" | "settings" | "sounds">("image");
  const wasOpenRef = useRef(open);
  const deadlineRef = useRef(Date.now() + session.remainingSeconds * 1000);
  const recordingRef = useRef<Howl | null>(null);
  const audioShouldPlay = session.sound !== "Sessiz" && !audioPaused;
  const audioShouldPlayRef = useRef(audioShouldPlay);
  audioShouldPlayRef.current = audioShouldPlay;

  const advanceRunning = (current: PomodoroSnapshot, now: number): PomodoroSnapshot => {
    if (!current.running || current.finished) return current;
    let { mode, completedFocuses } = current;
    let deadline = deadlineRef.current;
    while (now >= deadline) {
      const next = nextPomodoroStep(mode, completedFocuses, current.periodCount);
      mode = next.mode;
      completedFocuses = next.completedFocuses;
      if (next.finished) return {
        ...current, mode, completedFocuses, finished: true, started: false,
        running: false, remainingSeconds: 0, savedAt: now,
      };
      deadline += pomodoroSeconds(mode, current.durations) * 1000;
    }
    deadlineRef.current = deadline;
    const remainingSeconds = Math.ceil((deadline - now) / 1000);
    if (current.mode === mode && current.completedFocuses === completedFocuses
      && current.remainingSeconds === remainingSeconds) return current;
    return { ...current, mode, completedFocuses, remainingSeconds, savedAt: now };
  };

  useEffect(() => {
    if (!session.running) return;
    const tick = () => {
      setSession((current) => advanceRunning(current, Date.now()));
    };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [session.running]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...session, savedAt: Date.now() }));
    } catch { /* The timer still works when browser storage is unavailable. */ }
  }, [session]);

  useEffect(() => {
    recordingRef.current?.unload();
    recordingRef.current = null;
    if (session.sound === "Sessiz") return;
    const selected = soundSources.get(session.sound);
    if (!selected) return;
    const recording = new Howl({
      src: [selected.src], html5: true, loop: true, volume: session.volume * selected.gain,
    });
    recording.once("playerror", () => {
      recording.once("unlock", () => {
        if (recordingRef.current === recording && audioShouldPlayRef.current) recording.play();
      });
    });
    recordingRef.current = recording;
    return () => {
      recording.unload();
      if (recordingRef.current === recording) recordingRef.current = null;
    };
    // Changing volume uses the existing player; it should not restart the track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sound]);

  useEffect(() => {
    const recording = recordingRef.current;
    if (!recording) return;
    if (audioShouldPlay) {
      if (!recording.playing()) recording.play();
    } else {
      recording.pause();
    }
  }, [audioShouldPlay, session.sound]);

  useEffect(() => {
    const selected = soundSources.get(session.sound);
    if (!selected) return;
    recordingRef.current?.volume(session.volume * selected.gain);
  }, [session.sound, session.volume]);

  useEffect(() => { if (!open) setPanel("image"); }, [open]);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      const dock = [docks.sidebar, docks.mobile].find((element) => element && element.getClientRects().length > 0)
        ?? docks.sidebar ?? docks.mobile;
      dock?.querySelector<HTMLButtonElement>("button")?.focus();
    }
    wasOpenRef.current = open;
  }, [open, docks.sidebar, docks.mobile]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (panel !== "image") { setPanel("image"); return; }
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, panel]);

  const changePeriodCount = (periodCount: number) => {
    if (session.running || periodCount === session.periodCount) return;
    setSession((current) => ({
      ...current, periodCount, mode: "focus", completedFocuses: 0, finished: false,
      started: false, running: false,
      remainingSeconds: pomodoroSeconds("focus", current.durations), savedAt: Date.now(),
    }));
  };
  const changeSound = (sound: string) => {
    if (sound !== "Sessiz" && !soundSources.has(sound)) return;
    setSession((current) => ({ ...current, sound }));
    setAudioPaused(sound === "Sessiz");
  };
  const applyDurations = (durations: PomodoroDurations) => {
    setSession((current) => ({
      ...current, durations, mode: current.finished ? "focus" : current.mode,
      completedFocuses: current.finished ? 0 : current.completedFocuses,
      finished: false, started: false, running: false,
      remainingSeconds: pomodoroSeconds(current.finished ? "focus" : current.mode, durations), savedAt: Date.now(),
    }));
    setPanel("image");
  };
  const toggleAudio = () => {
    if (session.sound === "Sessiz") return;
    setAudioPaused((paused) => !paused);
  };
  const toggleTimer = () => {
    if (session.running) {
      setSession((current) => {
        const advanced = advanceRunning(current, Date.now());
        return {
          ...advanced, running: false, savedAt: Date.now(),
        };
      });
      return;
    }
    const remainingSeconds = session.finished
      ? pomodoroSeconds("focus", session.durations) : session.remainingSeconds || pomodoroSeconds(session.mode, session.durations);
    deadlineRef.current = Date.now() + remainingSeconds * 1000;
    setSession((current) => ({
      ...current, mode: current.finished ? "focus" : current.mode,
      completedFocuses: current.finished ? 0 : current.completedFocuses,
      finished: false, started: true, running: true, remainingSeconds, savedAt: Date.now(),
    }));
  };
  const resetTimer = () => {
    setSession((current) => ({
      ...current, mode: "focus", completedFocuses: 0, finished: false,
      started: false, running: false,
      remainingSeconds: pomodoroSeconds("focus", current.durations), savedAt: Date.now(),
    }));
  };
  const resetDisabled = !session.finished && !session.started && session.mode === "focus"
    && session.completedFocuses === 0 && session.remainingSeconds === pomodoroSeconds("focus", session.durations);
  const primaryLabel = session.finished ? "Yeniden başlat" : session.running ? "Duraklat" : session.started ? "Devam et" : "Başlat";
  const time = formatTime(session.remainingSeconds);
  const intervals = buildPomodoroTimeline(session.periodCount, session.durations);
  const activeIndex = session.finished ? intervals.length - 1
    : session.mode === "focus" ? session.completedFocuses * 2
      : session.mode === "shortBreak" ? session.completedFocuses * 2 - 1
        : intervals.length - 1;
  const currentPeriod = Math.min(session.periodCount,
    session.mode === "focus" ? session.completedFocuses + 1 : session.completedFocuses);
  const phaseTitle = session.finished ? "Tamamlandı"
    : session.mode === "focus" ? `Pomodoro ${currentPeriod} / ${session.periodCount}`
      : session.mode === "shortBreak" ? "Kısa mola" : "Uzun mola";
  const activeDuration = pomodoroSeconds(session.mode, session.durations);
  const phaseProgress = session.finished ? 1
    : Math.max(0, Math.min(1, (activeDuration - session.remainingSeconds) / activeDuration));
  const segments = intervals.map((interval, index) => ({
    key: `${interval.mode}-${interval.focusNumber}`,
    label: interval.mode === "focus" ? `Odak ${interval.focusNumber}`
      : interval.mode === "shortBreak" ? "Kısa mola" : "Uzun mola",
    minutes: interval.durationSeconds / 60,
    state: (session.finished || index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming") as "done" | "active" | "upcoming",
    progress: index === activeIndex ? phaseProgress : 0,
  }));
  const menuProps = {
    active: session.started || session.finished || audioShouldPlay,
    time, phaseTitle,
    soundSelected: session.sound !== "Sessiz", audioPlaying: audioShouldPlay,
    onOpen, onToggleAudio: toggleAudio,
    onSelectSound: () => { setPanel("sounds"); onOpen(); },
  };

  return <>
    {docks.sidebar ? createPortal(<FocusTimerMenu {...menuProps} variant={collapsed ? "collapsed" : "sidebar"} />, docks.sidebar) : null}
    {docks.mobile ? createPortal(<FocusTimerMenu {...menuProps} variant="mobile" />, docks.mobile) : null}

    <div className={cn("fixed inset-0 z-[70] grid place-items-center p-4 transition", open ? "visible" : "invisible")} aria-hidden={!open}>
      <button type="button" className={cn("absolute inset-0 bg-black/25 transition-opacity", open ? "opacity-100" : "opacity-0")} aria-label="Pomodoro penceresini kapat" onClick={onClose} />
      <section role="dialog" aria-modal={open} className={cn(
        "relative flex h-[min(520px,calc(100dvh-2rem))] w-full max-w-[780px] flex-col overflow-hidden rounded-[20px] border border-neutral-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,.16)] transition duration-300 md:flex-row",
        open ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[.985] opacity-0",
      )} aria-label="Pomodoro zamanlayıcısı">
        {panel === "image" ? <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900" aria-label="Kapat"><X className="h-4 w-4" /></button> : null}

        <div className={cn("relative min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-7 md:flex md:w-[62%]", panel === "image" ? "flex" : "hidden")}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-600"><Clock3 className="h-4 w-4" /> Pomodoro</div>
            <button type="button" aria-expanded={panel === "settings"} aria-label="Süreleri ayarla"
              onClick={() => setPanel("settings")}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
              <Settings2 className="h-3.5 w-3.5" /> Süre ayarı
            </button>
          </div>
          <div className="mt-4 text-center">
            <div className="text-[12px] font-semibold text-neutral-600" aria-live="polite">{phaseTitle}</div>
            <output aria-label="Kalan süre" className="mt-1 block text-[72px] font-semibold leading-none tracking-[-.065em] tabular-nums text-neutral-950 sm:text-[78px]">{time}</output>
          </div>

          <div className="mt-4">
            <FocusTimeline segments={segments} periodCount={session.periodCount}
              onPeriodCountChange={changePeriodCount} disabled={session.running} />
          </div>

          <div className="mt-3">
            <FocusSoundPlayer sound={session.sound} volume={session.volume} choices={soundChoices}
              playing={audioShouldPlay} onTogglePlay={toggleAudio}
              onSoundChange={changeSound}
              onVolumeChange={(volume) => setSession((current) => ({ ...current, volume }))}
              onOpenLibrary={() => setPanel("sounds")} />
          </div>

          <div className="mt-auto flex items-center justify-center gap-2 pt-3">
            <button type="button" onClick={() => { toggleTimer(); if (!session.running) onClose(); }}
              className="flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-lg bg-[#dc2626] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#b91c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]">
              {session.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {primaryLabel}
            </button>
            <button type="button" onClick={resetTimer} disabled={resetDisabled}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-semibold text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:border-neutral-200 disabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
              <RotateCcw className="h-3.5 w-3.5" /> Sıfırla
            </button>
          </div>
        </div>

        <div className={cn("relative min-h-0 overflow-hidden border-l border-neutral-100 bg-[#fbfaf7] md:w-[38%]", panel === "image" ? "hidden md:block" : "block w-full flex-1 md:flex-none")}>
          {panel === "settings" ? <FocusDurationSettings durations={session.durations} onApply={applyDurations} onClose={() => setPanel("image")} />
            : panel === "sounds" ? <FocusSoundLibrary sound={session.sound} choices={soundChoices} onSoundChange={changeSound} onClose={() => setPanel("image")} />
              : <><img src="/turkishmock-focus-study-v1.png" alt="Masasında odaklanarak çalışan öğrenci çizimi" className="absolute inset-0 h-full w-full object-cover object-[50%_38%] mix-blend-multiply" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#fbfaf7] to-transparent" /></>}
        </div>
      </section>
    </div>
  </>;
}
