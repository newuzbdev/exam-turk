import { useEffect, useRef, useState, type ComponentType } from "react";
import { AudioLines, CloudRain, ListMusic, Music2, Pause, Piano, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Album = "Lo-fi" | "Ortam" | "Klasik";
type SoundChoice = { label: string; group: Album };
type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

const albums: { name: Album; icon: Icon }[] = [
  { name: "Lo-fi", icon: AudioLines },
  { name: "Ortam", icon: CloudRain },
  { name: "Klasik", icon: Piano },
];
type PlayerProps = {
  sound: string;
  volume: number;
  choices: SoundChoice[];
  playing: boolean;
  onTogglePlay: () => void;
  onSoundChange: (sound: string) => void;
  onVolumeChange: (value: number) => void;
  onOpenLibrary: () => void;
};

export function FocusSoundPlayer({
  sound, volume, choices, playing, onTogglePlay, onSoundChange, onVolumeChange, onOpenLibrary,
}: PlayerProps) {
  const muted = sound === "Sessiz";
  const album = choices.find((item) => item.label === sound)?.group;
  const albumTracks = choices.filter((item) => item.group === album);
  const trackIndex = albumTracks.findIndex((item) => item.label === sound);
  const volumePercent = Math.round(Math.min(1, Math.max(0, volume)) * 100);
  const skipTrack = (direction: -1 | 1) => {
    if (trackIndex < 0 || albumTracks.length < 2) return;
    const nextIndex = (trackIndex + direction + albumTracks.length) % albumTracks.length;
    onSoundChange(albumTracks[nextIndex].label);
  };

  return (
    <div className="border-t border-neutral-200 pt-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-600" aria-hidden="true">
          <Music2 className="h-5 w-5" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium text-neutral-500">{muted ? "Ses kapalı" : playing ? `Çalıyor · ${album ?? "Ses"}` : album ?? "Arka plan sesi"}</div>
          <div className="truncate text-[13px] font-semibold leading-5 text-neutral-900" title={sound}>{sound}</div>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600"
        >
          <ListMusic className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Parçalar
        </button>
      </div>

      <div className="mt-2.5 flex min-w-0 items-center gap-2">
        <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Müzik oynatıcı denetimleri">
          <button type="button" onClick={() => skipTrack(-1)} disabled={muted || albumTracks.length < 2}
            aria-label="Önceki parça" title="Önceki parça"
            className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600">
            <SkipBack className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" onClick={onTogglePlay} disabled={muted}
            aria-label={playing ? "Sesi duraklat" : "Sesi dinle"}
            title={muted ? "Önce bir parça seç" : playing ? "Sesi duraklat" : "Sesi dinle"}
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-200 text-neutral-900 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600">
            {playing ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => skipTrack(1)} disabled={muted || albumTracks.length < 2}
            aria-label="Sonraki parça" title="Sonraki parça"
            className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600">
            <SkipForward className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          </button>
        </div>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200" aria-hidden="true" />
        {muted ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-500">Dinlemek için parça seç</span>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <button type="button" onClick={() => onSoundChange("Sessiz")} aria-label="Sesi kapat" title="Sesi kapat"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-600">
              <Volume2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <input type="range" min="0" max="100" step="1" value={volumePercent}
              onChange={(event) => onVolumeChange(Number(event.target.value) / 100)} aria-label="Ses düzeyi"
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-600" />
            <span className="w-8 shrink-0 text-right text-[11px] font-medium tabular-nums text-neutral-600">{volumePercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

type LibraryProps = {
  sound: string;
  choices: SoundChoice[];
  onSoundChange: (sound: string) => void;
  onClose: () => void;
};

export function FocusSoundLibrary({ sound, choices, onSoundChange, onClose }: LibraryProps) {
  const soundAlbum = choices.find((item) => item.label === sound)?.group;
  const [selectedAlbum, setSelectedAlbum] = useState<Album>(() => soundAlbum ?? "Lo-fi");
  const trackListRef = useRef<HTMLDivElement>(null);
  const selectedTrackRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!soundAlbum) return;
    setSelectedAlbum(soundAlbum);
  }, [soundAlbum]);
  useEffect(() => {
    selectedTrackRef.current?.scrollIntoView?.({ block: "nearest" });
  }, []);
  const tracks = choices.filter((item) => item.group === selectedAlbum);

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-white p-3.5 text-neutral-900"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold">Ses kütüphanesi</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSoundChange("Sessiz")}
            aria-pressed={sound === "Sessiz"}
            className={cn(
              "flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900",
              sound === "Sessiz" ? "bg-neutral-200 text-neutral-900" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            <VolumeX className="h-3 w-3" aria-hidden="true" /> Sessiz
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Ses kütüphanesini kapat"
            className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div role="group" aria-label="Ses albümleri" className="mt-3 grid grid-cols-3 gap-1.5">
        {albums.map(({ name, icon: AlbumIcon }) => (
          <button
            key={name}
            type="button"
            aria-pressed={selectedAlbum === name}
            onClick={() => { setSelectedAlbum(name); if (trackListRef.current) trackListRef.current.scrollTop = 0; }}
            className={cn(
              "flex min-w-0 flex-col items-start justify-center rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600",
              selectedAlbum === name ? "border-neutral-300 bg-neutral-200 text-neutral-900" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100",
            )}
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold"><AlbumIcon className="h-3 w-3" strokeWidth={1.8} aria-hidden={true} />{name}</span>
            <span className={cn("mt-0.5 text-[9px] tabular-nums", selectedAlbum === name ? "text-neutral-700" : "text-neutral-500")}>{choices.filter((item) => item.group === name).length} parça</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-b border-neutral-200 pb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-neutral-500">
        <span>{selectedAlbum}</span>
        <span className="tabular-nums">{String(tracks.length).padStart(2, "0")} parça</span>
      </div>
      <div ref={trackListRef} role="group" aria-label={`${selectedAlbum} parçaları`} className="mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {tracks.map((track, index) => (
          <button
            key={track.label}
            ref={sound === track.label ? selectedTrackRef : undefined}
            type="button"
            onClick={() => onSoundChange(track.label)}
            aria-pressed={sound === track.label}
            aria-label={`${index + 1}. ${track.label}`}
            title={track.label}
            className={cn(
              "flex h-[32px] w-full min-w-0 items-center gap-2 rounded-md px-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-600",
              sound === track.label ? "bg-neutral-200 text-neutral-900" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
            )}
          >
            <span className="w-4 shrink-0 text-[10px] font-medium tabular-nums text-neutral-400">{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{track.label}</span>
            {sound === track.label && <AudioLines className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
