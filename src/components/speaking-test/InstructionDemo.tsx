import React, { useState } from 'react';
import InstructionModal from './InstructionModal';
import { speakingInstructions } from '@/config/speakingInstructions';

const InstructionDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState(speakingInstructions[0]);

  const handleShowInstruction = (instruction: typeof speakingInstructions[0]) => {
    setCurrentInstruction(instruction);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Speaking Test Instructions Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {speakingInstructions.map((instruction) => (
          <div key={instruction.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-2">{instruction.sectionTitle}</h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-3">
              {instruction.instructionText.substring(0, 100)}...
            </p>
            <button
              onClick={() => handleShowInstruction(instruction)}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Test Instruction
            </button>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Click on any instruction card above to test the instruction modal with audio playback.
        </p>
        <div className="text-sm text-gray-500">
          <p>• Instructions will play automatically when opened</p>
          <p>• Users must listen to the instruction before continuing</p>
          <p>• Each instruction is specific to its section/subpart</p>
        </div>
      </div>

      {currentInstruction && (
        <InstructionModal
          isOpen={showModal}
          onClose={handleClose}
          instructionText={currentInstruction.instructionText}
          audioPath={currentInstruction.audioPath}
          sectionTitle={currentInstruction.sectionTitle}
        />
      )}
    </div>
  );
};

export default InstructionDemo;
