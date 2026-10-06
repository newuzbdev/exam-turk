import { cn } from "@/lib/utils";
import { pomodoroSeconds, type PomodoroDurations, type PomodoroMode } from "@/lib/focus-pomodoro-session";

type Props = {
  mode: PomodoroMode;
  durations: PomodoroDurations;
  remainingSeconds: number;
  completedFocuses: number;
  onModeChange: (mode: PomodoroMode) => void;
};

const modes: { mode: PomodoroMode; label: string }[] = [
  { mode: "focus", label: "Odak" },
  { mode: "shortBreak", label: "Kısa mola" },
  { mode: "longBreak", label: "Uzun mola" },
];

export function FocusTimeControls({ mode, durations, remainingSeconds, completedFocuses, onModeChange }: Props) {
  const fullSeconds = pomodoroSeconds(mode, durations);
  const seconds = Math.max(0, Math.min(fullSeconds, Math.ceil(remainingSeconds)));
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const elapsedPercent = Math.max(0, Math.min(100, ((fullSeconds - seconds) / fullSeconds) * 100));

  return <div className="pt-5">
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1" aria-label="Zamanlayıcı modu">
      {modes.map((item) => <button key={item.mode} type="button" aria-pressed={mode === item.mode}
        onClick={() => onModeChange(item.mode)}
        className={cn(
          "flex min-h-11 flex-col items-center justify-center rounded-[9px] px-1.5 py-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
          mode === item.mode ? "bg-white text-neutral-950 shadow-[0_1px_5px_rgba(0,0,0,.1)]" : "text-neutral-500 hover:text-neutral-950",
        )}>
        <span className="text-[12px] font-semibold leading-4 sm:text-[13px]">{item.label}</span>
        <span className="text-[10px] leading-4 opacity-70">{durations[item.mode]} dk</span>
      </button>)}
    </div>

    <div className="mt-4 text-center">
      <output aria-label="Kalan süre" className="block text-[72px] font-semibold leading-none tracking-[-.065em] tabular-nums text-neutral-950 sm:text-[78px]">{time}</output>
      <div className="mx-auto mt-4 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-label="Bu sürenin ilerlemesi" aria-valuemin={0} aria-valuemax={fullSeconds} aria-valuenow={fullSeconds - seconds}>
        <div className="h-full rounded-full bg-[#d60000] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${elapsedPercent}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2" aria-label={`Dört odaktan ${completedFocuses} tanesi tamamlandı`}>
        {Array.from({ length: 4 }, (_, index) => <span key={index} className={cn("h-1.5 w-1.5 rounded-full", index < completedFocuses ? "bg-[#d60000]" : "bg-neutral-200")} />)}
      </div>
    </div>
  </div>;
}
