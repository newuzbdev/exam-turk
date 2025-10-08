import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Play, Pause, CheckCircle } from 'lucide-react';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructionText: string;
  audioPath: string;
  sectionTitle: string;
}

const InstructionModal: React.FC<InstructionModalProps> = ({
  isOpen,
  onClose,
  instructionText,
  audioPath,
  sectionTitle
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && audioPath) {
      console.log('Creating audio element for path:', audioPath);
      
      // Create audio element with proper error handling
      const audio = new Audio(audioPath);
      audioRef.current = audio;
      
      const handleEnded = () => {
        console.log('Audio ended successfully');
        setIsPlaying(false);
        setHasPlayed(true);
      };

      const handleError = (e: any) => {
        console.error('Audio error:', e);
        console.error('Audio path:', audioPath);
        console.error('Audio error details:', audio.error);
        console.error('Audio network state:', audio.networkState);
        console.error('Audio ready state:', audio.readyState);
        setIsPlaying(false);
        setHasPlayed(true);
      };

      const handleCanPlay = () => {
        console.log('Audio can play - ready state:', audio.readyState);
        console.log('Audio duration:', audio.duration);
        console.log('Audio src:', audio.src);
        setIsLoading(false);
        
        // Auto-play when audio is ready
        if (audioRef.current && !isPlaying) {
          console.log('Attempting to play audio...');
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            setHasPlayed(true);
            console.log('Audio started playing automatically');
          }).catch((error) => {
            console.error('Auto-play failed:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            setIsPlaying(false);
            // Still mark as played so user can continue
            setHasPlayed(true);
          });
        }
      };

      const handleLoadStart = () => {
        console.log('Audio load started');
        setIsLoading(true);
      };

      const handleLoadedData = () => {
        console.log('Audio data loaded');
      };

      const handleCanPlayThrough = () => {
        console.log('Audio can play through');
      };

      if (audioRef.current) {
        audioRef.current.addEventListener('ended', handleEnded);
        audioRef.current.addEventListener('error', handleError);
        audioRef.current.addEventListener('canplay', handleCanPlay);
        audioRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
        audioRef.current.addEventListener('loadstart', handleLoadStart);
        audioRef.current.addEventListener('loadeddata', handleLoadedData);
        
        // Set audio properties for better compatibility
        audioRef.current.preload = 'auto';
        audioRef.current.crossOrigin = 'anonymous';
        
        // Load the audio
        audioRef.current.load();
        
        console.log('Audio element created and load initiated');
        console.log('Audio src after load:', audioRef.current.src);
        
        // Fallback: try to play after a short delay if autoplay fails
        setTimeout(() => {
          if (audioRef.current && !isPlaying && !hasPlayed) {
            console.log('Fallback: attempting to play audio after delay');
            audioRef.current.play().then(() => {
              setIsPlaying(true);
              setHasPlayed(true);
              console.log('Fallback audio play successful');
            }).catch((error) => {
              console.error('Fallback audio play failed:', error);
            });
          }
        }, 1000);
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.removeEventListener('error', handleError);
          audioRef.current.removeEventListener('canplay', handleCanPlay);
          audioRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
          audioRef.current.removeEventListener('loadstart', handleLoadStart);
          audioRef.current.removeEventListener('loadeddata', handleLoadedData);
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [isOpen, audioPath]);

  const togglePlayPause = async () => {
    if (!audioRef.current) {
      console.error('Audio element not available');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('Audio paused');
      } else {
        console.log('Attempting to play audio:', audioPath);
        console.log('Audio ready state:', audioRef.current.readyState);
        
        // Ensure audio is loaded
        if (audioRef.current.readyState < 2) {
          console.log('Audio not ready, waiting...');
          audioRef.current.load();
          await new Promise(resolve => {
            audioRef.current!.addEventListener('canplay', resolve, { once: true });
          });
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        setHasPlayed(true);
        console.log('Audio playing successfully');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleContinue = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onClose();
  };

  if (!isOpen) return null;

  const handleModalClick = () => {
    // Try to play audio on user interaction (helps with autoplay policies)
    if (audioRef.current && !isPlaying && !hasPlayed) {
      console.log('User interaction detected, attempting to play audio');
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setHasPlayed(true);
        console.log('Audio started on user interaction');
      }).catch((error) => {
        console.error('Audio play failed on user interaction:', error);
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 flex flex-col"
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {sectionTitle}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-red-700 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Instruction Text - No Card */}
          <div className="max-w-4xl w-full mb-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Instructions</h3>
              <div className="w-16 h-1 bg-red-600 mx-auto rounded"></div>
            </div>
            
            <div className="text-center">
              <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-line">
                {instructionText}
              </p>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center justify-center mb-8">
            <button
              onClick={togglePlayPause}
              className="flex items-center space-x-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg transition-colors text-lg font-semibold shadow-lg"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              <span>{isPlaying ? 'Pause' : 'Play'} Instructions</span>
            </button>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-center"
            >
              <p className="text-sm text-orange-600 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                Loading audio...
              </p>
            </motion.div>
          )}

          {/* Auto-play indicator */}
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-center"
            >
              <p className="text-sm text-blue-600 flex items-center justify-center">
                <Volume2 size={16} className="mr-2" />
                Playing instructions automatically...
              </p>
            </motion.div>
          )}

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              className={`flex items-center space-x-3 px-8 py-4 rounded-lg transition-colors text-lg font-semibold shadow-lg ${
                hasPlayed
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!hasPlayed}
            >
              <CheckCircle size={24} />
              <span>Continue to Test</span>
            </button>
          </div>

          {/* Fallback - Manual Continue Button */}
          {!hasPlayed && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">Audio not working?</p>
              <button
                onClick={() => {
                  setHasPlayed(true);
                  console.log('Manually marked as played');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Click here to continue without audio
              </button>
            </div>
          )}

          {/* Progress Indicator */}
          {hasPlayed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <p className="text-lg text-green-600 flex items-center justify-center font-medium">
                <CheckCircle size={20} className="mr-2" />
                Instructions completed. You can now proceed to the test.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstructionModal;
