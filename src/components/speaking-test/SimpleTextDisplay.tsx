import React from 'react';

interface SimpleTextDisplayProps {
  text: string;
  isPlaying: boolean;
}

const SimpleTextDisplay: React.FC<SimpleTextDisplayProps> = ({ text, isPlaying }) => {
  return (
    <div className={`${isPlaying ? 'h-screen' : 'min-h-screen'} flex items-center justify-center bg-white`}>
      <div className="text-center max-w-6xl mx-auto px-8">
        {/* Simple title - hide when playing instructions */}
        {!isPlaying && (
          <h1 className="text-5xl font-bold text-gray-900 mb-24 tracking-tight">
            Bölüm Açıklaması
          </h1>
        )}
        
        {/* Simple text - no background card */}
        <div className="text-2xl text-gray-800 leading-loose font-serif whitespace-pre-line max-w-5xl mx-auto space-y-6">
          {text.split('\n').map((line, index) => (
            <p key={index} className="mb-6 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleTextDisplay;
