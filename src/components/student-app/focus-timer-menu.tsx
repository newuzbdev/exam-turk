import { Clock3, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

type FocusTimerMenuProps = {
  active: boolean;
  time: string;
  phaseTitle: string;
  soundSelected: boolean;
  audioPlaying: boolean;
  onOpen: () => void;
  onToggleAudio: () => void;
  onSelectSound: () => void;
  variant?: "sidebar" | "collapsed" | "mobile";
};

export function FocusTimerMenu({
  active, time, phaseTitle, soundSelected, audioPlaying,
  onOpen, onToggleAudio, onSelectSound, variant = "sidebar",
}: FocusTimerMenuProps) {
  const collapsed = variant === "collapsed";
  const mobile = variant === "mobile";
  const openLabel = active
    ? `Pomodoro penceresini aç, ${phaseTitle}, kalan süre ${time}`
    : "Pomodoro zamanlayıcısını aç";
  const audioLabel = soundSelected
    ? audioPlaying ? "Müziği duraklat" : "Müziği oynat"
    : "Ses seç";

  return <div role="group" aria-label="Pomodoro menü kontrolleri" className={cn(
    "flex min-w-0 items-center rounded-md text-[var(--tm-text-secondary)]",
    collapsed ? "flex-col gap-1 py-1" : mobile ? "gap-0.5" : "h-10 gap-1 pl-3 pr-1",
  )}>
    <button type="button" onClick={onOpen} aria-label={openLabel} title={active ? `${phaseTitle} · ${time}` : "Pomodoro"}
      className={cn(
        "flex min-w-0 items-center rounded-md text-sm font-medium transition-colors hover:text-[var(--tm-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
        collapsed ? "w-full flex-col gap-1 py-1" : mobile ? "h-9 justify-center gap-1 px-1" : "h-10 flex-1 gap-2 text-left",
        !active && (collapsed ? "h-10 justify-center" : mobile ? "w-9 hover:bg-[var(--tm-bg-hover)]" : "hover:bg-[var(--tm-bg-hover)]"),
      )}>
      {!mobile || !active ? <Clock3 aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} /> : null}
      {!collapsed && !mobile ? <span>Pomodoro</span> : null}
      {active ? <output aria-label="Menüde kalan süre" className={cn(
        "shrink-0 text-[12px] font-semibold tabular-nums",
        !collapsed && !mobile && "ml-auto",
      )}>{time}</output> : null}
    </button>
    {active ? <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={soundSelected ? onToggleAudio : onSelectSound}
        aria-label={audioLabel} title={audioLabel} aria-pressed={audioPlaying}
        className={cn("grid shrink-0 place-items-center rounded-md text-neutral-600 hover:bg-white hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900", collapsed ? "h-6 w-6" : "h-7 w-7")}>
        {audioPlaying ? <Volume2 aria-hidden="true" className="h-3.5 w-3.5" /> : <VolumeX aria-hidden="true" className="h-3.5 w-3.5" />}
      </button>
    </div> : null}
  </div>;
}
