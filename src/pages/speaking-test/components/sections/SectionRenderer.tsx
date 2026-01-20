import type { Section } from "@/pages/speaking-test/SpeakingTest";
import Part1Section from "./Part1Section";
import Part2Section from "./Part2Section";
import Part3Section from "./Part3Section";

interface SectionRendererProps {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  onNextSection: () => void;
  onRecord: (questionId: string) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  isRecording: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  currentlyRecordingQuestionId: string | null;
  answeredQuestions: Set<string>;
  recordingDuration: number;
}

const SectionRenderer = ({
  section,
  sectionIndex,
  totalSections,
  onNextSection,
  onRecord,
  onStop,
  onPause,
  onResume,
  isRecording,
  isPaused,
  hasRecording,
  currentlyRecordingQuestionId,
  answeredQuestions,
  recordingDuration,
}: SectionRendererProps) => {
  const renderSection = () => {
    switch (section.type) {
      case "PART1":
        return (
          <Part1Section
            section={section}
            sectionIndex={sectionIndex}
            totalSections={totalSections}
            onNextSection={onNextSection}
            onRecord={onRecord}
            onStop={onStop}
            onPause={onPause}
            onResume={onResume}
            isRecording={isRecording}
            isPaused={isPaused}
            hasRecording={hasRecording}
            currentlyRecordingQuestionId={currentlyRecordingQuestionId}
            answeredQuestions={answeredQuestions}
            recordingDuration={recordingDuration}
          />
        );
      case "PART2":
        return (
          <Part2Section
            section={section}
            sectionIndex={sectionIndex}
            totalSections={totalSections}
            onNextSection={onNextSection}
            onRecord={onRecord}
            onStop={onStop}
            onPause={onPause}
            onResume={onResume}
            isRecording={isRecording}
            isPaused={isPaused}
            hasRecording={hasRecording}
            currentlyRecordingQuestionId={currentlyRecordingQuestionId}
            answeredQuestions={answeredQuestions}
            recordingDuration={recordingDuration}
          />
        );
      case "PART3":
        return (
          <Part3Section
            section={section}
            sectionIndex={sectionIndex}
            totalSections={totalSections}
            onNextSection={onNextSection}
            onRecord={onRecord}
            onStop={onStop}
            onPause={onPause}
            onResume={onResume}
            isRecording={isRecording}
            isPaused={isPaused}
            hasRecording={hasRecording}
            currentlyRecordingQuestionId={currentlyRecordingQuestionId}
            answeredQuestions={answeredQuestions}
            recordingDuration={recordingDuration}
          />
        );
      default:
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Bilinmeyen Bölüm Türü
            </h3>
            <p className="text-red-700">
              Bu bölüm türü ({section.type}) desteklenmiyor.
            </p>
          </div>
        );
    }
  };

  return <div className="section-renderer">{renderSection()}</div>;
};

export default SectionRenderer;