import React, { useState } from 'react';

const AudioTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const testAudioFile = async (path: string, name: string) => {
    try {
      const audio = new Audio(path);
      
      const result = await new Promise<string>((resolve) => {
        const timeout = setTimeout(() => {
          resolve('Timeout - Audio did not load within 5 seconds');
        }, 5000);

        audio.addEventListener('canplay', () => {
          clearTimeout(timeout);
          resolve('Success - Audio can play');
        }, { once: true });

        audio.addEventListener('error', (e) => {
          clearTimeout(timeout);
          resolve(`Error - ${e.type}: ${audio.error?.message || 'Unknown error'}`);
        }, { once: true });

        audio.load();
      });

      setTestResults(prev => ({ ...prev, [name]: result }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [name]: `Exception - ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const audioFiles = [
    { path: '/1.1 Speaking.mp3', name: '1.1 Speaking' },
    { path: '/1.2.mp3', name: '1.2' },
    { path: '/2..mp3', name: '2' },
    { path: '/3..mp3', name: '3' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audio Files Test</h1>
      
      <div className="space-y-4">
        {audioFiles.map((file) => (
          <div key={file.name} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{file.name}</h3>
                <p className="text-sm text-gray-600">{file.path}</p>
                {testResults[file.name] && (
                  <p className={`text-sm mt-1 ${
                    testResults[file.name].includes('Success') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {testResults[file.name]}
                  </p>
                )}
              </div>
              <button
                onClick={() => testAudioFile(file.path, file.name)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Test" for each audio file</li>
          <li>Check if the result shows "Success" or an error message</li>
          <li>If there are errors, the audio files might not be accessible</li>
        </ol>
      </div>
    </div>
  );
};

export default AudioTest;
