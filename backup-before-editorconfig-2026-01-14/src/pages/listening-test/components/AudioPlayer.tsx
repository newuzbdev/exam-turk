import React, { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  src: string;
  onAudioEnded: () => void;
}

export const AudioPlayer = ({ src, onAudioEnded }: AudioPlayerProps) => {
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasStartedRef = useRef(false);
  // Web Audio removed: rely on native element volume/muted only for reliability

  // Debug: Log the src when component mounts
  useEffect(() => {
    console.log("AudioPlayer mounted with src:", src);
    hasStartedRef.current = false;
  }, [src]);

  // Auto-play when component mounts - only once
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && src && !hasStartedRef.current) {
      console.log("Attempting auto-play...");
      
      const tryAutoPlay = async () => {
        if (hasStartedRef.current) return; // Prevent double play
        
        try {
          // Ensure audio is loaded before playing
          if (audio.readyState < 2) {
            audio.load();
            await new Promise((resolve) => {
              audio.addEventListener('canplay', resolve, { once: true });
            });
          }
          
          if (!hasStartedRef.current && audio.paused) {
            hasStartedRef.current = true;
            await audio.play();
            console.log("Auto-play successful!");
          }
        } catch (error) {
          console.log("Auto-play failed:", error);
          hasStartedRef.current = false;
          // Retry after a delay only if not already started
          setTimeout(() => {
            if (!hasStartedRef.current) {
              tryAutoPlay();
            }
          }, 2000);
        }
      };

      // Try to play after a small delay to ensure audio is loaded
      setTimeout(tryAutoPlay, 500);
    }
  }, [src]);

  // Removed Web Audio pipeline

  // Keep the underlying audio element in sync with React volume state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (volume === 0) {
        // Just mute when volume is 0, don't stop
        audio.muted = true;
      } else {
        audio.muted = false;
        audio.volume = volume;
      }
    }
  }, [volume]);


  // Handle audio ended event - start timer
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        console.log("Audio ended - starting timer");
        onAudioEnded();
      };
      
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [onAudioEnded]);

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-gray-300">
      <audio 
        ref={audioRef} 
        src={src} 
        preload="auto"
        onLoadStart={() => console.log("Audio load started")}
        onLoadedData={() => console.log("Audio data loaded")}
        onCanPlay={() => console.log("Audio can play")}
        onError={(e) => console.error("Audio error:", e)}
        onEnded={() => {
          console.log("Audio ended - starting timer");
          onAudioEnded();
        }}
      />
      
      {/* Volume Slider */}
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-xs text-gray-600 hidden sm:inline">Volume:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-12 sm:w-16 lg:w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs text-gray-600 min-w-[25px] sm:min-w-[30px]">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};