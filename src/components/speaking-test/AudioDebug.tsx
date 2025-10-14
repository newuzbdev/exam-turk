import React, { useState } from 'react';

const AudioDebug: React.FC = () => {
  const [result, setResult] = useState<string>('');

  const testAudio = () => {
    setResult('Testing...');
    
    const audio = new Audio('/1.1.mp3');
    
    audio.addEventListener('loadstart', () => {
      setResult(prev => prev + '\nLoad started');
    });
    
    audio.addEventListener('canplay', () => {
      setResult(prev => prev + '\nCan play');
    });
    
    audio.addEventListener('error', (_e) => {
      setResult(prev => prev + `\nError: ${audio.error?.message || 'Unknown error'}`);
      setResult(prev => prev + `\nNetwork state: ${audio.networkState}`);
      setResult(prev => prev + `\nReady state: ${audio.readyState}`);
    });
    
    audio.addEventListener('loadeddata', () => {
      setResult(prev => prev + '\nData loaded');
    });
    
    audio.load();
    
    setTimeout(() => {
      audio.play().then(() => {
        setResult(prev => prev + '\nPlay successful');
      }).catch((error) => {
        setResult(prev => prev + `\nPlay failed: ${error.message}`);
      });
    }, 1000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Audio Debug Test</h1>
      <button 
        onClick={testAudio}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Test Audio
      </button>
      <div className="bg-gray-100 p-4 rounded">
        <pre className="whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
};

export default AudioDebug;
