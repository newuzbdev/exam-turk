import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Section } from "@/pages/speaking-test/SpeakingTest";
import QuestionCard from "../QuestionCard";
import { Timer } from "@/components/speaking-test/Timer";
import CountdownTimer from "@/components/speaking-test/CountdownTimer";
import { Pause, Play, Square } from "lucide-react";

interface Part3SectionProps {
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

const Part3Section = ({
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
  answeredQuestions,
}: Part3SectionProps) => {
  // State for tracking current phase and timing
  const [currentPhase, setCurrentPhase] = useState<"instructions" | "preparation" | "speaking">("instructions");
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute preparation
  console.log(timeLeft)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);

  // Get the first question for recording
  const getQuestion = () => {
    if (section.subParts.length > 0 && section.subParts[0].questions.length > 0) {
      return section.subParts[0].questions[0];
    }
    return null;
  };

  // Check if question is answered
  const isQuestionAnswered = () => {
    const question = getQuestion();
    return question ? answeredQuestions.has(question.id) : false;
  };

  // Handle start preparation
  const handleStartPreparation = () => {
    setCurrentPhase("preparation");
    setTimeLeft(60); // 1 minute
    setIsTimerRunning(true);
  };

  // Handle preparation timer complete
  const handlePreparationComplete = () => {
    setIsTimerRunning(false);
    setShowCountdown(true);
    setCountdownSeconds(5);
  };

  // Handle countdown complete
  const handleCountdownComplete = () => {
    setShowCountdown(false);
    setCurrentPhase("speaking");
    setTimeLeft(120); // 2 minutes
    setIsTimerRunning(true);
    
    // Start recording
    const question = getQuestion();
    if (question) {
      onRecord(question.id);
    }
  };

  // Handle speaking timer complete
  const handleSpeakingComplete = () => {
    setIsTimerRunning(false);
    if (isRecording) {
      onStop();
    }
  };

  // Handle timer complete based on current phase
  const handleTimerComplete = () => {
    if (currentPhase === "preparation") {
      handlePreparationComplete();
    } else if (currentPhase === "speaking") {
      handleSpeakingComplete();
    }
  };

  const question = getQuestion();

  // If we're showing countdown, render it
  if (showCountdown) {
    return (
      <CountdownTimer
        seconds={countdownSeconds}
        onComplete={handleCountdownComplete}
        message="Konuşmaya başlayın..."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {section.title} - Bölüm {sectionIndex + 1}/{totalSections}
        </h2>
        <p className="text-gray-600 whitespace-pre-line">
          {section.description}
        </p>
      </div>

      {/* Topic Display */}
      {section.content && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Konu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-base font-medium text-gray-900">{section.content}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pros/Cons Table */}
      {section.subParts.length > 0 && section.subParts[0].questions.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Argümanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-green-800 mb-2">Olumlu Argümanlar</h3>
                <ul className="space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-1.5 mt-0.5">✓</span>
                    <span className="text-green-700 text-sm">Öğrencilerin iletişim becerilerini geliştirir</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-1.5 mt-0.5">✓</span>
                    <span className="text-green-700 text-sm">Grup çalışması ile öğrenmeyi teşvik eder</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-1.5 mt-0.5">✓</span>
                    <span className="text-green-700 text-sm">Öğrencilerin özgüvenini artırır</span>
                  </li>
                </ul>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Olumsuz Argümanlar</h3>
                <ul className="space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-1.5 mt-0.5">✗</span>
                    <span className="text-red-700 text-sm">Sınıf yönetimi zorlaşabilir</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-1.5 mt-0.5">✗</span>
                    <span className="text-red-700 text-sm">Bazı öğrenciler susturulabilir</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-1.5 mt-0.5">✗</span>
                    <span className="text-red-700 text-sm">Zaman yönetimi sorunları oluşabilir</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase-specific Content */}
      {currentPhase === "instructions" && (
        <div className="space-y-4">
          <QuestionCard
            question={{
              id: `part3-instructions-${section.id}`,
              questionText: "Yukarıdaki konu hakkında 2 dakikalık bir konuşma yapacaksınız. Her iki taraftan (olumlu ve olumsuz) en az iki argüman seçerek dengeli bir görüş sunun.",
              sectionTitle: section.title,
              sectionDescription: section.description
            }}
            isRecording={false}
            isPaused={false}
            hasRecording={false}
            recordingDuration={0}
            onRecord={() => {}}
            onPause={() => {}}
            onResume={() => {}}
            onStop={() => {}}
            onNext={() => handleStartPreparation()}
            showNextButton={true}
            showCountdownAfterStop={true}
            showCountdownAfterNext={true}
          />
          
          <div className="text-center">
            <Button
              onClick={handleStartPreparation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Hazırlanmaya Başla
            </Button>
          </div>
        </div>
      )}

      {/* Preparation Phase */}
      {currentPhase === "preparation" && (
        <div className="space-y-4">
          <Timer
            duration={60}
            onComplete={handleTimerComplete}
            autoStart={true}
            showControls={true}
            type="preparation"
            isActive={isTimerRunning}
          />
          
          <div className="text-center">
            <Button 
              onClick={() => {
                setIsTimerRunning(false);
                setCurrentPhase("instructions");
              }}
              variant="outline"
              className="mr-2"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Speaking Phase */}
      {currentPhase === "speaking" && (
        <div className="space-y-4">
          <Timer
            duration={120}
            onComplete={handleTimerComplete}
            autoStart={true}
            showControls={false}
            type="answer"
            isActive={isTimerRunning}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Konuşma</CardTitle>
            </CardHeader>
            <CardContent>
              {question ? (
                <div className="space-y-4">
                  <p className="text-gray-700 font-medium">
                    Yukarıdaki konu hakkında dengeli bir görüş sunun.
                  </p>
                  
                  <div className="flex justify-center gap-3">
                    {!hasRecording && !isRecording && (
                      <Button
                        onClick={() => question && onRecord(question.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
                        disabled={true}
                      >
                        Kayıt Devam Ediyor...
                      </Button>
                    )}
                    
                    {isRecording && !isPaused && (
                      <>
                        <Button
                          onClick={onPause}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Pause className="h-6 w-6" />
                          Duraklat
                        </Button>
                        <Button
                          onClick={onStop}
                          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Square className="h-6 w-6" />
                          Durdur
                        </Button>
                      </>
                    )}
                    
                    {isRecording && isPaused && (
                      <>
                        <Button
                          onClick={onResume}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Play className="h-6 w-6" />
                          Devam Et
                        </Button>
                        <Button
                          onClick={onStop}
                          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Square className="h-6 w-6" />
                          Durdur
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {isRecording && (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 text-red-600">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        {isPaused ? "Kayıt duraklatıldı" : "Kayıt yapılıyor..."}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Soru bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completion */}
      {isQuestionAnswered() && currentPhase === "speaking" && !isTimerRunning && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Bölüm Tamamlandı!
          </h3>
          <p className="text-green-700 mb-4">
            Bu bölümdeki konuşmanız kaydedildi.
          </p>
          <Button 
            onClick={onNextSection}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Sonraki Bölüm
          </Button>
        </div>
      )}
    </div>
  );
};

export default Part3Section;