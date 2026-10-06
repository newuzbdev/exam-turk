import { cn } from "@/lib/utils";

type TimelineSegment = {
  key: string;
  label: string;
  minutes: number;
  state: "done" | "active" | "upcoming";
  progress: number;
};

type Props = {
  segments: TimelineSegment[];
  periodCount: number;
  onPeriodCountChange: (count: number) => void;
  disabled?: boolean;
};

const periodOptions = [1, 2, 3, 4] as const;

export function FocusTimeline({ segments, periodCount, onPeriodCountChange, disabled = false }: Props) {
  return <div className="w-full min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-neutral-600">Dönem</span>
      <div role="group" aria-label="Dönem sayısı" className="flex shrink-0 items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5">
        {periodOptions.map((count) => <button
          key={count}
          type="button"
          aria-label={disabled ? `${count} dönem; değiştirmek için sayacı duraklatın` : `${count} dönem`}
          aria-pressed={periodCount === count}
          disabled={disabled}
          title={disabled ? "Dönem sayısını değiştirmek için sayacı duraklatın" : undefined}
          onClick={() => onPeriodCountChange(count)}
          className={cn(
            "grid h-7 w-8 place-items-center rounded-md text-[11px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed",
            periodCount === count
              ? "bg-white text-neutral-950 shadow-[0_1px_4px_rgba(0,0,0,.12)]"
              : "text-neutral-500 hover:text-neutral-900 disabled:hover:text-neutral-500",
          )}
        >{count}</button>)}
      </div>
    </div>

    {segments.length > 0 ? <div role="list" aria-label="Pomodoro zaman çizelgesi" className="mt-3 flex w-full min-w-0 gap-0.5">
      {segments.map((segment) => {
        const progress = Number.isFinite(segment.progress)
          ? Math.min(1, Math.max(0, segment.progress)) : 0;
        const status = segment.state === "done" ? "tamamlandı"
          : segment.state === "active" ? `%${Math.round(progress * 100)} tamamlandı` : "sırada";
        return <div
          key={segment.key}
          role="listitem"
          aria-current={segment.state === "active" ? "step" : undefined}
          aria-label={`${segment.label}, ${segment.minutes} dakika, ${status}`}
          data-state={segment.state}
          className="min-w-0 flex-1"
        >
          <div className="h-2 overflow-hidden rounded-[3px] bg-neutral-200" aria-hidden="true">
            <div
              className="h-full rounded-[3px] bg-neutral-700 transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${segment.state === "done" ? 100 : segment.state === "active" ? progress * 100 : 0}%` }}
            />
          </div>
          <div aria-hidden="true" className={cn(
            "mt-1.5 min-h-[22px] break-words text-center text-[9px] font-medium leading-[11px] sm:text-[10px]",
            segment.state === "active" ? "text-neutral-950" : "text-neutral-500",
          )}>{segment.label}</div>
        </div>;
      })}
    </div> : null}
  </div>;
}
