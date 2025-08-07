import { useState,  } from "react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/pages/speaking-test/SpeakingTest";
import QuestionCard from "../QuestionCard";
import CountdownTimer from "@/components/speaking-test/CountdownTimer";

interface Part1SectionProps {
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

const Part1Section = ({
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
  currentlyRecordingQuestionId,
  answeredQuestions,
  recordingDuration,
}: Part1SectionProps) => {
  // State for tracking current phase and question
  const [currentPhase, setCurrentPhase] = useState<"personal" | "images">("personal");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);

  // Get questions based on current phase
  const getQuestions = () => {
    if (currentPhase === "personal" && section.subParts.length > 0) {
      // Personal questions are in the first subPart
      return section.subParts[0]?.questions || [];
    } else if (currentPhase === "images" && section.subParts.length > 1) {
      // Image questions are in the second subPart (index 1)
      return section.subParts[1]?.questions || [];
    }
    return [];
  };

  // Get current question
  const getCurrentQuestion = () => {
    const questions = getQuestions();
    return questions[currentQuestionIndex];
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    const currentQuestion = getCurrentQuestion();
    return currentQuestion ? answeredQuestions.has(currentQuestion.id) : false;
  };

  // Handle next question
  const handleNextQuestion = () => {
    const questions = getQuestions();
    const currentQuestion = getCurrentQuestion();
    
    // If we have a current question and it's not answered, we can't proceed
    if (currentQuestion && !isCurrentQuestionAnswered()) {
      // Start countdown before allowing to record
      setShowCountdown(true);
      setCountdownSeconds(5);
      return;
    }
    
    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // If we're at the end of personal questions, move to images phase
      if (currentPhase === "personal" && section.subParts.length > 1) {
        setCurrentPhase("images");
        setCurrentQuestionIndex(0);
        setCurrentImageIndex(0);
      } else {
        // If we're at the end of all questions, move to next section
        onNextSection();
      }
    }
  };

  // Handle previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      // If we're at the beginning of images, move back to personal
      if (currentPhase === "images" && section.subParts.length > 0) {
        setCurrentPhase("personal");
        setCurrentQuestionIndex(section.subParts[0]?.questions?.length - 1 || 0);
      }
    }
  };

  // Handle countdown completion
  const handleCountdownComplete = () => {
    setShowCountdown(false);
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      onRecord(currentQuestion.id);
    }
  };

  // Handle countdown during preparation
  const handlePreparationCountdown = (seconds: number) => {
    setShowCountdown(true);
    setCountdownSeconds(seconds);
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    const questions = getQuestions();
    if (questions.length === 0) return 0;
    
    // If in images phase and there are images, factor in image progress
    if (currentPhase === "images" && section.subParts.length > 1 && section.subParts[1]?.images?.length > 0) {
      const imagesCount = section.subParts[1].images.length;
      const imageProgress = (currentImageIndex + 1) / imagesCount;
      const questionProgress = (currentQuestionIndex + imageProgress) / questions.length;
      return Math.round(questionProgress * 100);
    }
    
    return Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  };

  // Get total questions in current phase
  const getTotalQuestionsInPhase = () => {
    const questions = getQuestions();
    return questions.length;
  };

  // Get answered questions in current phase
  const getAnsweredQuestionsInPhase = () => {
    const questions = getQuestions();
    return questions.filter(q => answeredQuestions.has(q.id)).length;
  };

  const currentQuestion = getCurrentQuestion();

  // If we're showing countdown, render it
  if (showCountdown) {
    return (
      <CountdownTimer
        seconds={countdownSeconds}
        onComplete={handleCountdownComplete}
        message="Hazırlanın..."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {section.title} - Bölüm {sectionIndex + 1}/{totalSections}
        </h2>
        <p className="text-gray-600 text-sm whitespace-pre-line">
          {section.description}
        </p>
      </div>

      {/* Phase Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            currentPhase === "personal"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}>
            Kişisel Sorular
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            currentPhase === "images"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}>
            Resim Soruları
          </span>
        </div>
        
        <div className="text-xs text-gray-600 font-medium">
          {currentPhase === "images" && section.subParts.length > 1 && section.subParts[1]?.images?.length > 1
            ? `Resim ${currentImageIndex + 1}/${section.subParts[1]?.images?.length || 0}`
            : `Soru ${currentQuestionIndex + 1}/${getTotalQuestionsInPhase()}`}
        </div>
      </div>

      {/* Image Display for Images Phase */}
      {currentPhase === "images" && section.subParts.length > 1 && section.subParts[1]?.images && section.subParts[1]?.images.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-medium text-gray-900">Görsel</h3>
            {section.subParts[1]?.images.length > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentImageIndex === 0}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentImageIndex(prev => Math.min((section.subParts[1]?.images?.length || 1) - 1, prev + 1))}
                  disabled={currentImageIndex === (section.subParts[1]?.images?.length || 1) - 1}
                >
                  Sonraki
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <img
              src={section.subParts[1]?.images[currentImageIndex] || ""}
              alt={`Speaking test visual ${currentImageIndex + 1}`}
              className="max-w-full h-auto rounded-lg border border-gray-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://placehold.co/400x300?text=Görsel+Yüklenemedi";
              }}
            />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${getProgressPercentage()}%` }}
        ></div>
      </div>

      {/* Question Card */}
      {currentQuestion ? (
        <QuestionCard
          question={{
            id: currentQuestion.id,
            questionText: currentQuestion.questionText,
            sectionTitle: section.title,
            sectionDescription: currentPhase === "personal" && section.subParts.length > 0
              ? section.subParts[0]?.description || section.description
              : section.subParts.length > 1
              ? section.subParts[1]?.description || section.description
              : section.description,
            subPartLabel: currentPhase === "personal"
              ? section.subParts[0]?.label
              : section.subParts[1]?.label
          }}
          isRecording={isRecording && currentlyRecordingQuestionId === currentQuestion.id}
          isPaused={isPaused}
          hasRecording={isCurrentQuestionAnswered()}
          recordingDuration={recordingDuration}
          onRecord={() => handlePreparationCountdown(5)}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onNext={handleNextQuestion}
          showNextButton={isCurrentQuestionAnswered() && currentQuestionIndex < getTotalQuestionsInPhase() - 1}
          showCountdownAfterStop={true}
          showCountdownAfterNext={true}
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Soru Bulunamadı
          </h3>
          <p className="text-yellow-700">
            Bu bölümde henüz soru tanımlanmamış.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentPhase === "personal" && currentQuestionIndex === 0}
        >
          Önceki Soru
        </Button>
        
        <Button
          onClick={handleNextQuestion}
          disabled={!isCurrentQuestionAnswered() && !currentlyRecordingQuestionId}
        >
          {currentPhase === "images" && currentQuestionIndex === getTotalQuestionsInPhase() - 1
            ? "Sonraki Bölüm" 
            : "Sonraki Soru"}
        </Button>
      </div>

      {/* Section Completion */}
      {getAnsweredQuestionsInPhase() === getTotalQuestionsInPhase() && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-700 font-medium">
            Bu bölümdeki tüm soruları tamamladınız!
          </p>
          <Button 
            onClick={onNextSection} 
            className="mt-2 bg-green-600 hover:bg-green-700"
          >
            Sonraki Bölüm
          </Button>
        </div>
      )}
    </div>
  );
};

export default Part1Section;