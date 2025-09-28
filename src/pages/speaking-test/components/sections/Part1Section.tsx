import { useState, useEffect, useRef } from "react";
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
  const [currentPhase, setCurrentPhase] = useState<"instructions" | "personal" | "images">("instructions");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [answerTimer, setAnswerTimer] = useState(0);
  const [isAnswerTimerActive, setIsAnswerTimerActive] = useState(false);
  // Guard to auto-start only once per question when entering images phase
  const autoStartQuestionRef = useRef<string | null>(null);

  // Part 1 Answer Timer - 30 seconds max
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAnswerTimerActive && answerTimer < 30) {
      interval = setInterval(() => {
        setAnswerTimer(prev => {
          if (prev >= 29) {
            setIsAnswerTimerActive(false);
            // Auto-stop recording after 30 seconds
            if (isRecording) {
              onStop();
            }
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAnswerTimerActive, answerTimer, isRecording, onStop]);

  // Start answer timer when recording starts
  useEffect(() => {
    if (isRecording && !isAnswerTimerActive) {
      setAnswerTimer(0);
      setIsAnswerTimerActive(true);
    } else if (!isRecording) {
      setIsAnswerTimerActive(false);
    }
  }, [isRecording, isAnswerTimerActive]);

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

  // Start personal questions phase
  const handleStartPersonalQuestions = () => {
    setCurrentPhase("personal");
    setCurrentQuestionIndex(0);
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
    
    // Move to next question regardless of whether current question is answered
    // The QuestionCard component will handle showing the countdown if needed
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // If we're at the end of personal questions, move to images phase
      if (currentPhase === "personal" && section.subParts.length > 1) {
        setCurrentPhase("images");
        setCurrentQuestionIndex(0);
        setCurrentImageIndex(0);
        // Reset auto-start guard so the first images question can auto begin
        autoStartQuestionRef.current = null;
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
  const handleCountdownComplete = async () => {
    setShowCountdown(false);
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      try {
        await onRecord(currentQuestion.id);
      } catch (error) {
        console.error("Error starting recording after countdown:", error);
      }
    }
  };

  // Handle countdown during preparation - 5 seconds preparation for Part 1
  const handlePreparationCountdown = () => {
    setShowCountdown(true);
    setCountdownSeconds(5); // Part 1: 5 seconds preparation time
  };

  // Auto-start the first question when entering images phase (1.2)
  useEffect(() => {
    if (currentPhase !== "images") return;
    const q = getCurrentQuestion();
    if (!q) return;
    // Only if not already answered, not recording, and we haven't auto-started this question
    if (!answeredQuestions.has(q.id) && !isRecording && autoStartQuestionRef.current !== q.id && !showCountdown) {
      autoStartQuestionRef.current = q.id;
      // Trigger the 5s preparation countdown, then recording starts in handleCountdownComplete
      handlePreparationCountdown();
    }
  }, [currentPhase, currentQuestionIndex, answeredQuestions, isRecording, showCountdown]);

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
        message="Düşünme Zamanı"
        type="preparation"
        part={1}
      />
    );
  }

  // Show instructions first
  if (currentPhase === "instructions") {
    return (
      <div className="space-y-6">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {section.title} - Bölüm {sectionIndex + 1}/{totalSections}
          </h2>
        </div>

        {/* Instructions Card */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-8 border-2 border-orange-200 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-orange-800 mb-4">Bölüm Talimatları</h3>
          </div>
          
          <div className="bg-white rounded-lg p-6 mb-6 border border-orange-200">
            <p className="text-xl leading-relaxed text-gray-800">
              Birinci bölüm iki kısımdan oluşmaktadır. Önce size kendiniz ve ilgi alanlarınız hakkında üç kısa soru sorulacaktır. 
              Sonra size bir resim gösterilecek ve bu resim hakkında üç soru sorulacaktır. Konuşmaya başlamadan önce hazırlanmanız için beş saniyeniz olacaktır.
              <br /><br />
              <strong>IELTS Formatı:</strong> Kısa, doğal cevaplar verin (30 saniye).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-2">⏱️ Zamanlar</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• Tayyorlanish: 5 saniye</li>
                <li>• Cevap: 30 saniye</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-lg font-semibold text-green-800 mb-2">📝 Yapıcınız</h4>
              <ul className="text-green-700 space-y-1">
                <li>• Kısa ve net cevaplar</li>
                <li>• Doğal konuşma</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartPersonalQuestions}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Hazırım - Başlayalım! 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {section.title} - Bölüm {sectionIndex + 1}/{totalSections}
        </h2>
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
        <div className="bg-gray-50 rounded-lg p-4">
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
            {(() => {
              const imgs = section.subParts[1]?.images || [];
              if (imgs.length === 1) {
                return (
                  <div className="w-full max-w-xl aspect-[4/3] bg-transparent rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={imgs[0]}
                      alt={`Speaking test visual 1`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/800x600?text=Görsel+Yüklenemedi";
                      }}
                    />
                  </div>
                );
              }
              if (imgs.length >= 2) {
                return (
                  <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[imgs[0], imgs[1]].map((src, idx) => (
                      <div key={`img-${idx}`} className="aspect-[4/3] bg-transparent rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={src}
                          alt={`Speaking test visual ${idx + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://placehold.co/800x600?text=Görsel+Yüklenemedi";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
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

      {/* Answer Timer for Part 1 */}
      {isAnswerTimerActive && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium">Cevap Süresi</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 font-mono">
                {30 - answerTimer}s
              </div>
              <div className="text-xs text-green-700">kalan süre</div>
            </div>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(answerTimer / 30) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Question Card */}
      {currentQuestion ? (
        <QuestionCard
          question={{
            id: currentQuestion.id,
            questionText: currentQuestion.questionText,
            sectionTitle: section.title,
            subPartLabel: currentPhase === "personal"
              ? section.subParts[0]?.label
              : section.subParts[1]?.label
          }}
          isRecording={isRecording && currentlyRecordingQuestionId === currentQuestion.id}
          isPaused={isPaused}
          hasRecording={isCurrentQuestionAnswered()}
          recordingDuration={recordingDuration}
          onRecord={handlePreparationCountdown}
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