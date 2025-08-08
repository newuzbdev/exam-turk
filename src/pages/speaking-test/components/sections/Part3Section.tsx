import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Section } from "@/pages/speaking-test/SpeakingTest";
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
        message="Konuşma Zamanı"
        type="answer"
        part={3}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {section.title} - Bölüm {sectionIndex + 1}/{totalSections}
        </h2>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-lg font-medium text-purple-800 whitespace-pre-line">
            {section.description}
          </p>
        </div>
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
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-8 border-2 border-purple-200 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-purple-800 mb-4">Bölüm Talimatları</h3>
          </div>
          
          <div className="bg-white rounded-lg p-6 mb-6 border border-purple-200">
            <p className="text-xl leading-relaxed text-gray-800">
              Sınavci Part 2 konusuyla ilgili daha soyut ve genel sorular soracak. 
              Bu sorular daha geniş konular ve fikirler hakkında tartışmanıza olanak tanır.
              <br /><br />
              <strong>IELTS Formatı:</strong> Detaylı, analitik cevaplar verin (45-60 saniye).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h4 className="text-lg font-semibold text-orange-800 mb-2">⏱️ Zamanlar</h4>
              <ul className="text-orange-700 space-y-1">
                <li>• Hazırlık: 1 dakika</li>
                <li>• Konuşma: 2 dakika</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-lg font-semibold text-green-800 mb-2">📝 Yapıcınız</h4>
              <ul className="text-green-700 space-y-1">
                <li>• Argümanları inceleyin</li>
                <li>• Dengeli görüş oluşturun</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartPreparation}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Hazırım - Başlayalım! 🚀
            </button>
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
            part={3}
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
            part={3}
            isActive={isTimerRunning}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Konuşma</CardTitle>
            </CardHeader>
            <CardContent>
              {question ? (
                <div className="space-y-4">
                  <p className="text-4xl font-bold text-gray-900 mb-6 text-center leading-relaxed">
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