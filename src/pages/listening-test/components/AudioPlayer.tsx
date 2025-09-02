import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, FastForward, Rewind } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  src: string;
}

export const AudioPlayer = ({ src }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Vaqtni yangilash
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    // Davomiylikni o'rnatish
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    // Tinglovchilarni qo'shish
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    // Komponent yo'q qilinganda tinglovchilarni tozalash
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [src]);

  // Tugmalarni boshqarish
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = parseFloat(e.target.value);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Vaqtni formatlash
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button variant="ghost" size="icon" onClick={handlePlayPause}>
        {isPlaying ? <Pause /> : <Play />}
      </Button>
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 rounded-lg appearance-none bg-gray-200 cursor-pointer"
        />
      </div>
      <div className="text-sm font-mono text-gray-600">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};