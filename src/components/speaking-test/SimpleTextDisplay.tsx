import React from 'react';

interface SimpleTextDisplayProps {
  text: string;
  isPlaying: boolean;
}

const SimpleTextDisplay: React.FC<SimpleTextDisplayProps> = ({ text, isPlaying }) => {
  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center bg-white py-12 sm:py-14">
      <div className="text-center max-w-5xl mx-auto px-4 sm:px-6">
        {!isPlaying && (
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Bölüm Açıklaması
          </h1>
        )}

        <div className="text-lg sm:text-xl md:text-2xl text-gray-800 leading-relaxed whitespace-pre-line space-y-3">
          {text.split('\n').map((line, index) => (
            <p key={index} className="mb-2 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleTextDisplay;
