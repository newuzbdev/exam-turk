import React, { useState, useRef, useEffect } from "react";
import { Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  onAudioEnded: () => void;
}

export const AudioPlayer = ({ src, onAudioEnded }: AudioPlayerProps) => {
  const [volume, setVolume] = useState(0.7);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
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
          // Ensure audio is loaded before playing
          if (audio.readyState < 2) {
            audio.load();
            await new Promise((resolve) => {
              audio.addEventListener('canplay', resolve, { once: true });
            });
          }
          
          await audio.play();
          console.log("Auto-play successful!");
          setIsPlaying(true);
          setShowPlayButton(false);
        } catch (error) {
          console.log("Auto-play failed:", error);
          // Don't show play button, just keep trying
          setShowPlayButton(false);
          // Retry after a longer delay
          setTimeout(tryAutoPlay, 2000);
        }
      };

      // Try to play after a small delay to ensure audio is loaded
      setTimeout(tryAutoPlay, 500);
    }
  }, [src]);

  // Add click handler to trigger audio on user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      const audio = audioRef.current;
      if (audio && src && audio.paused) {
        audio.play().catch(console.error);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
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