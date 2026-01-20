import React, { useState } from 'react';

const AudioTestSimple: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAudio = async () => {
    try {
      setError(null);
      const audio = new Audio('/1.1%20Speaking.mp3');
      
      audio.addEventListener('canplay', () => {
        console.log('Audio can play');
        audio.play().then(() => {
          setIsPlaying(true);
          console.log('Audio started playing');
        }).catch((err) => {
          console.error('Play failed:', err);
          setError('Play failed: ' + err.message);
        });
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        console.log('Audio ended');
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setError('Audio error: ' + audio.error?.message);
      });

      audio.load();
    } catch (err) {
      console.error('Exception:', err);
      setError('Exception: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audio Test - 1.1 Speaking.mp3</h1>
      
      <div className="space-y-4">
        <button
          onClick={testAudio}
          disabled={isPlaying}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg"
        >
          {isPlaying ? 'Playing...' : 'Test Audio'}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isPlaying && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <strong>Success:</strong> Audio is playing!
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Audio Path:</strong> /1.1%20Speaking.mp3</p>
          <p><strong>Full URL:</strong> http://localhost:3002/1.1%20Speaking.mp3</p>
        </div>
      </div>
    </div>
  );
};

export default AudioTestSimple;
