"use client"

import { motion } from "framer-motion"
import { Mic, Check, Pause, Play, Square } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Section } from "@/pages/speaking-test/SpeakingTest"
import { Timer } from "@/components/speaking-test/Timer"
import CountdownTimer from "@/components/speaking-test/CountdownTimer"

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

interface Point {
  id: string;
  sectionId: string;
  type: "ADVANTAGE" | "DISADVANTAGE";
  order: number;
  example: Array<{
    order: number;
    text: string;
  }>;
  createdAt: string;
  updatedAt: string;
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
  recordingDuration,
}: Part3SectionProps) => {
  // State for tracking current phase and timing
  const [currentPhase, setCurrentPhase] = useState<"instructions" | "preparation" | "speaking">("instructions");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);

  // Get the first question for recording (just for recording purposes, we show debate topic)
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

  // Get advantages and disadvantages from points
  const getAdvantages = () => {
    if (!section.points) return [];
    return section.points
      .filter((point: Point) => point.type === "ADVANTAGE")
      .sort((a, b) => a.order - b.order);
  };

  const getDisadvantages = () => {
    if (!section.points) return [];
    return section.points
      .filter((point: Point) => point.type === "DISADVANTAGE")
      .sort((a, b) => a.order - b.order);
  };

  // Handle start preparation
  const handleStartPreparation = () => {
    setCurrentPhase("preparation");
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
    // Mark question as answered and navigate to next section
    const question = getQuestion();
    if (question && !answeredQuestions.has(question.id)) {
      // The question will be marked as answered when recording stops
      // After a brief delay to ensure recording is saved, navigate
      setTimeout(() => {
        onNextSection();
      }, 500);
    } else if (question && answeredQuestions.has(question.id)) {
      // Already answered, navigate immediately
      onNextSection();
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

  const advantages = getAdvantages();
  const disadvantages = getDisadvantages();

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

  // Preparation Phase - Show debate interface with timer
  if (currentPhase === "preparation") {
    return (
      <div className="min-h-screen bg-amber-50 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
              <div className="bg-red-600 text-white px-2 sm:px-3 py-1 rounded font-bold text-sm sm:text-lg">
                TURKISHMOCK
              </div>
            </div>

            <div className="flex gap-1 sm:gap-2">
              <motion.div
                className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Check className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <motion.div
                className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Check className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <motion.div
                className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <span className="text-white text-xl sm:text-2xl font-bold">3</span>
              </motion.div>
            </div>

            <div className="text-lg sm:text-2xl font-bold">
              <span className="text-green-600">MULTI</span>
              <span className="text-[10px] sm:text-xs bg-green-600 text-white px-1 ml-1 rounded">TEACH</span>
            </div>
          </motion.div>

          {/* Debate Table */}
          <motion.div
            className="bg-amber-100 border-2 border-gray-400 rounded-lg overflow-hidden mb-4 sm:mb-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-amber-200 border-b-2 border-gray-400 p-3 sm:p-4 text-center">
              <h1 className="text-base sm:text-xl font-semibold text-gray-800 text-balance">
                {section.title === "Section 3" ? "Üniversite diplomanın iş alımda zorunlu olması" : section.title}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* For Column */}
              <motion.div
                className="p-4 sm:p-6 md:border-r-2 border-gray-400 border-b-2 md:border-b-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Lehte</h2>
                <ul className="space-y-3 sm:space-y-4 text-gray-700">
                  {advantages.map((advantage, index) => (
                    <li key={advantage.id} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="leading-relaxed text-sm sm:text-base">
                        {advantage.example?.[0]?.text || `Avantaj ${index + 1}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Against Column */}
              <motion.div
                className="p-4 sm:p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Aleyhte</h2>
                <ul className="space-y-3 sm:space-y-4 text-gray-700">
                  {disadvantages.map((disadvantage, index) => (
                    <li key={disadvantage.id} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="leading-relaxed text-sm sm:text-base">
                        {disadvantage.example?.[0]?.text || `Dezavantaj ${index + 1}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>

          {/* Timer and Controls */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Timer
              duration={60}
              onComplete={handleTimerComplete}
              autoStart={true}
              showControls={true}
              type="preparation"
              part={3}
              isActive={isTimerRunning}
            />

            <div className="mt-4">
              <Button
                onClick={() => {
                  setIsTimerRunning(false);
                  setCurrentPhase("instructions");
                }}
                variant="outline"
              >
                İptal
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Speaking Phase
  if (currentPhase === "speaking") {
    return (
      <div className="min-h-screen bg-amber-50 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="font-bold text-base sm:text-lg text-gray-800">TurkishMock</div>
                <div className="text-xs sm:text-sm text-gray-600">Platform</div>
              </div>
            </div>

            <div className="flex gap-1 sm:gap-2">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl sm:text-2xl font-bold">3</span>
              </div>
            </div>

            <div className="text-lg sm:text-2xl font-bold">
              <span className="text-green-600">MULTI</span>
              <span className="text-[10px] sm:text-xs bg-green-600 text-white px-1 ml-1 rounded">TEACH</span>
            </div>
          </motion.div>

          {/* Debate Table */}
          <motion.div
            className="bg-amber-100 border-2 border-gray-400 rounded-lg overflow-hidden mb-4 sm:mb-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-amber-200 border-b-2 border-gray-400 p-3 sm:p-4 text-center">
              <h1 className="text-base sm:text-xl font-semibold text-gray-800 text-balance">
                {section.title === "Section 3" ? "Üniversite diplomanın iş alımda zorunlu olması" : section.title}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* For Column */}
              <motion.div
                className="p-4 sm:p-6 md:border-r-2 border-gray-400 border-b-2 md:border-b-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Lehte</h2>
                <ul className="space-y-3 sm:space-y-4 text-gray-700">
                  {advantages.map((advantage, index) => (
                    <li key={advantage.id} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="leading-relaxed text-sm sm:text-base">
                        {advantage.example?.[0]?.text || `Avantaj ${index + 1}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Against Column */}
              <motion.div
                className="p-4 sm:p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Aleyhte</h2>
                <ul className="space-y-3 sm:space-y-4 text-gray-700">
                  {disadvantages.map((disadvantage, index) => (
                    <li key={disadvantage.id} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="leading-relaxed text-sm sm:text-base">
                        {disadvantage.example?.[0]?.text || `Dezavantaj ${index + 1}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>

          {/* Bottom Controls */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Recording Controls */}
            <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
              {isRecording && !isPaused && (
                <>
                  <Button
                    onClick={onPause}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 rounded-xl text-sm sm:text-base"
                  >
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Duraklat</span>
                    <span className="sm:hidden">Duraklat</span>
                  </Button>
                  <Button
                    onClick={onStop}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 rounded-xl text-sm sm:text-base"
                  >
                    <Square className="h-4 w-4 sm:h-5 sm:w-5" />
                    Durdur
                  </Button>
                </>
              )}

              {isRecording && isPaused && (
                <>
                  <Button
                    onClick={onResume}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 rounded-xl text-sm sm:text-base"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Devam Et</span>
                    <span className="sm:hidden">Devam</span>
                  </Button>
                  <Button
                    onClick={onStop}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 rounded-xl text-sm sm:text-base"
                  >
                    <Square className="h-4 w-4 sm:h-5 sm:w-5" />
                    Durdur
                  </Button>
                </>
              )}
            </div>

            {/* Microphone */}
            <motion.div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 ${isRecording
                ? isPaused
                  ? "bg-yellow-500"
                  : "bg-red-500 animate-pulse"
                : hasRecording
                  ? "bg-green-500"
                  : "bg-red-500"
                }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </motion.div>

            {/* Timer */}
            <div className="flex-shrink-0">
              <Timer
                duration={120}
                onComplete={handleTimerComplete}
                autoStart={true}
                showControls={false}
                type="answer"
                part={3}
                isActive={isTimerRunning}
              />
            </div>
          </motion.div>

          {/* Recording Status */}
          {isRecording && (
            <motion.div
              className="text-center mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="inline-flex items-center gap-2 text-red-600 text-base sm:text-lg font-medium">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-sm sm:text-base">{isPaused ? "Kayıt duraklatıldı" : "Kayıt yapılıyor..."}</span>
              </div>
              <div className="mt-2 text-base sm:text-lg font-semibold text-gray-800">
                Süre: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </div>
            </motion.div>
          )}
        </div>
      </div>
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
            Bu bölümde belirli bir konu hakkında iki dakikalık bir konuşma yapmanız gerekmektedir. Ekranda konu ve bu konunun lehinde ve aleyhinde listelenmiş maddeler gösterilecektir. 
            Hazırlanmanız için bir dakikanız olacaktır. Bu süre zarfında not alabilir ve düşünebilirsiniz. Sonra konu hakkında 2 dakika konuşacaksınız.
          </p>
        </div>
      </div>

      {/* Instructions Phase */}
      {currentPhase === "instructions" && (
        <div className="min-h-screen bg-amber-50 p-3 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-0"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded-full"></div>
                  </div>
                </div>
                <div className="bg-red-600 text-white px-2 sm:px-3 py-1 rounded font-bold text-sm sm:text-lg">
                  TURKISHMOCK
                </div>
              </div>

              <div className="flex gap-1 sm:gap-2">
                <motion.div
                  className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <Check className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </motion.div>
                <motion.div
                  className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <Check className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </motion.div>
                <motion.div
                  className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <span className="text-white text-xl sm:text-2xl font-bold">3</span>
                </motion.div>
              </div>

              <div className="text-lg sm:text-2xl font-bold">
                <span className="text-green-600">MULTI</span>
                <span className="text-[10px] sm:text-xs bg-green-600 text-white px-1 ml-1 rounded">TEACH</span>
              </div>
            </motion.div>

            {/* Debate Table */}
            <motion.div
              className="bg-amber-100 border-2 border-gray-400 rounded-lg overflow-hidden mb-4 sm:mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-amber-200 border-b-2 border-gray-400 p-3 sm:p-4 text-center">
                <h1 className="text-base sm:text-xl font-semibold text-gray-800 text-balance">
                  {section.title === "Section 3" ? "Üniversite diplomanın iş alımda zorunlu olması" : section.title}
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* For Column */}
                <motion.div
                  className="p-4 sm:p-6 md:border-r-2 border-gray-400 border-b-2 md:border-b-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Lehte</h2>
                  <ul className="space-y-3 sm:space-y-4 text-gray-700">
                    {advantages.map((advantage, index) => (
                      <li key={advantage.id} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed text-sm sm:text-base">
                          {advantage.example?.[0]?.text || `Avantaj ${index + 1}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Against Column */}
                <motion.div
                  className="p-4 sm:p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Aleyhte</h2>
                  <ul className="space-y-3 sm:space-y-4 text-gray-700">
                    {disadvantages.map((disadvantage, index) => (
                      <li key={disadvantage.id} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed text-sm sm:text-base">
                          {disadvantage.example?.[0]?.text || `Dezavantaj ${index + 1}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </motion.div>

            {/* Start Button */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <button
                onClick={handleStartPreparation}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-lg sm:text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
              >
                Hazırım - Başlayalım! 🚀
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Completion */}
      {isQuestionAnswered() && !isTimerRunning && (
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
            Testi Tamamla
          </Button>
        </div>
      )}
    </div>
  );
};

export default Part3Section;
