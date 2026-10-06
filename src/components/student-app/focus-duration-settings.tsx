import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { type PomodoroDurations } from "@/lib/focus-pomodoro-session";

type Props = {
  durations: PomodoroDurations;
  onApply: (durations: PomodoroDurations) => void;
  onClose: () => void;
};

const rows = [
  { key: "focus", label: "Odak", max: 180 },
  { key: "shortBreak", label: "Kısa mola", max: 60 },
  { key: "longBreak", label: "Uzun mola", max: 60 },
] as const;

export function FocusDurationSettings({ durations, onApply, onClose }: Props) {
  const [values, setValues] = useState({
    focus: String(durations.focus),
    shortBreak: String(durations.shortBreak),
    longBreak: String(durations.longBreak),
  });
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = {
      focus: Number(values.focus),
      shortBreak: Number(values.shortBreak),
      longBreak: Number(values.longBreak),
    };
    if (rows.some(({ key, max }) => !/^\d+$/.test(values[key]) || parsed[key] < 1 || parsed[key] > max)) {
      setError("Odak 1–180 dk, molalar 1–60 dk arasında olmalı.");
      return;
    }
    onApply(parsed);
  };

  return <form onSubmit={submit} noValidate aria-label="Pomodoro sürelerini ayarla"
    className="flex h-full w-full flex-col bg-[#fbfaf7] px-5 py-6 sm:px-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-semibold text-neutral-950">Süreleri ayarla</h2>
        <p className="mt-1 text-[12px] leading-4 text-neutral-500">Kaydedince bulunduğun bölüm yeniden başlar.</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Süre ayarlarını kapat"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
        <X className="h-4 w-4" />
      </button>
    </div>

    <div className="mt-8 space-y-2">
      {rows.map(({ key, label, max }) => <label key={key} className="flex h-12 items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3">
        <span className="text-[13px] font-medium text-neutral-800">{label}</span>
        <span className="flex items-center gap-1.5">
          <input type="number" min="1" max={max} step="1" inputMode="numeric"
            aria-label={`${label} süresi, dakika`}
            value={values[key]} onChange={(event) => {
              setValues((current) => ({ ...current, [key]: event.target.value }));
              setError("");
            }}
            className="h-9 w-16 rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-right text-[14px] font-semibold tabular-nums text-neutral-950 outline-none focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900" />
          <span className="text-[12px] text-neutral-500">dk</span>
        </span>
      </label>)}
    </div>
    {error ? <p className="mt-2 text-[12px] text-red-700" role="alert">{error}</p> : null}
    <div className="mt-auto flex gap-2 pt-5">
      <button type="button" onClick={onClose} className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">Vazgeç</button>
      <button type="submit" className="h-10 flex-1 rounded-xl bg-neutral-700 text-[13px] font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700">Kaydet</button>
    </div>
  </form>;
}
