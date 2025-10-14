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
          <h1 className="text-4xl font-bold text-gray-900 mb-12">
            Bölüm Açıklaması
          </h1>
        )}
        
        {/* Simple text - no background card */}
        <p className="text-4xl text-gray-800 leading-relaxed font-medium whitespace-pre-line">
          {text}
        </p>
      </div>
    </div>
  );
};

export default SimpleTextDisplay;
