import React, { useState, useRef, useEffect } from "react";
import { Volume2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  src: string;
  onAudioEnded: () => void;
}

export const AudioPlayer = ({ src, onAudioEnded }: AudioPlayerProps) => {
  const [volume, setVolume] = useState(0.7);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Debug: Log the src when component mounts
  useEffect(() => {
    console.log("AudioPlayer mounted with src:", src);
  }, [src]);

  // Auto-play when component mounts
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && src) {
      console.log("Attempting auto-play...");
      
      const tryAutoPlay = async () => {
        try {
          await audio.play();
          console.log("Auto-play successful!");
          setIsPlaying(true);
          setShowPlayButton(false);
        } catch (error) {
          console.log("Auto-play failed, showing play button:", error);
          setShowPlayButton(true);
        }
      };

      // Try to play after a small delay to ensure audio is loaded
      setTimeout(tryAutoPlay, 500);
    }
  }, [src]);

  // Keep the underlying audio element in sync with React volume state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      // Explicitly toggle muted for browsers that optimize zero volume
      audio.muted = volume === 0;
    }
  }, [volume]);

  // Simple play function
  const playAudio = async () => {
    console.log("Play button clicked!");
    const audio = audioRef.current;
    console.log("Audio element:", audio);
    console.log("Audio src:", audio?.src);
    
    if (audio) {
      try {
        console.log("Attempting to play audio...");
        await audio.play();
        console.log("Audio started playing!");
        setIsPlaying(true);
        setShowPlayButton(false);
      } catch (error) {
        console.error("Play failed:", error);
      }
    } else {
      console.error("No audio element found!");
    }
  };

  // Handle audio ended event
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        onAudioEnded();
      };
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [onAudioEnded]);

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
      audio.muted = newVolume === 0;
      setVolume(newVolume);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
      <audio 
        ref={audioRef} 
        src={src} 
        preload="auto"
        onLoadStart={() => console.log("Audio load started")}
        onLoadedData={() => console.log("Audio data loaded")}
        onCanPlay={() => console.log("Audio can play")}
        onError={(e) => console.error("Audio error:", e)}
        onEnded={() => {
          console.log("Audio ended");
          setIsPlaying(false);
          onAudioEnded();
        }}
      />
      
      {/* Play Button */}
      {showPlayButton && (
        <Button 
          onClick={playAudio}
          size="sm"
          className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600"
        >
          <Play className="h-3 w-3" />
        </Button>
      )}
      
      {/* Volume Slider */}
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-gray-600" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs text-gray-600 min-w-[25px]">
          {Math.round(volume * 100)}%
        </span>
      </div>
      
      {/* Status indicator */}
     
    </div>
  );
};