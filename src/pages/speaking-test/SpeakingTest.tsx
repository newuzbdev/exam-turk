import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Clock,
  AlertCircle,
  Pause,
  Square,
  Play,
} from "lucide-react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import Timer from "@/components/speaking-test/Timer";
import speechToTextService from "@/services/speechToText.service";
import speakingSubmissionService from "@/services/speakingSubmission.service";

interface Question {
  id: string;
  questionId?: string;
  description: string;
  images: string[];
}

interface SubPart {
  id: string;
  sectionId: string;
  label: string;
  description: string;
  images: string[];
  questions: Question[];
}

interface Section {
  id: string;
  speakingTestId: string;
  order: number;
  title: string;
  description: string;
  images: string[];
  type: "PART1" | "PART2" | "PART3";
  content: string;
  subParts: SubPart[];
  questions: Question[];
}

interface SpeakingTestData {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
  sections: Section[];
}

type TestPhase =
  | "loading"
  | "instructions"
  | "preparation"
  | "recording"
  | "processing"
  | "completed";

interface TestState {
  currentSectionIndex: number;
  currentSubPartIndex: number;
  currentQuestionIndex: number;
  phase: TestPhase;
  answers: Record<string, string>;
  audioBlobs: Record<string, Blob>;
}

const SpeakingTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [testData, setTestData] = useState<SpeakingTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testState, setTestState] = useState<TestState>({
    currentSectionIndex: 0,
    currentSubPartIndex: 0,
    currentQuestionIndex: 0,
    phase: "loading",
    answers: {},
    audioBlobs: {},
  });

  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  // Fetch test data
  useEffect(() => {
    const fetchTestData = async () => {
      if (!testId) return;

      try {
        const response = await axiosPrivate.get(`/api/speaking-test/${testId}`);
        console.log("Test data received:", response.data);
        setTestData(response.data);
        setTestState((prev) => ({ ...prev, phase: "instructions" }));
      } catch (error: unknown) {
        console.error("Error fetching test data:", error);
        toast.error("Test verileri yüklenemedi");
        navigate("/test");
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [testId, navigate]);

  // Get timing configuration based on section type and question
  const getTimingConfig = () => {
    if (!testData) return { preparation: 5, answer: 30 };

    const currentSection = testData.sections[testState.currentSectionIndex];
    const isSubPart = currentSection.subParts.length > 0;

    if (currentSection.type === "PART1") {
      if (isSubPart) {
        // 1.1 questions: 5 seconds prep, 30 seconds answer
        // 1.2 questions: 10 seconds prep, 30 seconds answer
        const subPartLabel =
          currentSection.subParts[testState.currentSubPartIndex]?.label;
        return subPartLabel === "1.1"
          ? { preparation: 5, answer: 30 }
          : { preparation: 10, answer: 30 };
      }
      return { preparation: 5, answer: 30 };
    } else if (currentSection.type === "PART2") {
      // Part 2: 1 minute prep, 2 minutes answer
      return { preparation: 60, answer: 120 };
    } else if (currentSection.type === "PART3") {
      // Part 3: 1 minute prep, 2 minutes answer
      return { preparation: 60, answer: 120 };
    }

    return { preparation: 5, answer: 30 };
  };

  const getCurrentQuestion = () => {
    if (!testData) return null;

    const currentSection = testData.sections[testState.currentSectionIndex];
    if (!currentSection) return null;

    if (currentSection.subParts.length > 0) {
      const currentSubPart =
        currentSection.subParts[testState.currentSubPartIndex];
      if (!currentSubPart) return null;
      return currentSubPart.questions[testState.currentQuestionIndex] || null;
    } else {
      return currentSection.questions[testState.currentQuestionIndex] || null;
    }
  };

  const getCurrentContext = () => {
    if (!testData) return null;

    const currentSection = testData.sections[testState.currentSectionIndex];
    if (!currentSection) return null;

    if (currentSection.subParts.length > 0) {
      const currentSubPart =
        currentSection.subParts[testState.currentSubPartIndex];
      return {
        section: currentSection,
        subPart: currentSubPart,
        question: getCurrentQuestion(),
      };
    } else {
      return {
        section: currentSection,
        subPart: null,
        question: getCurrentQuestion(),
      };
    }
  };

  const startTest = () => {
    setTestState((prev) => ({ ...prev, phase: "preparation" }));
  };

  const handlePreparationComplete = () => {
    setTestState((prev) => ({ ...prev, phase: "recording" }));
    startRecording();
  };

  const handlePauseRecording = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handleSubmitAnswer = async () => {
    stopRecording();
    setTestState((prev) => ({ ...prev, phase: "processing" }));

    // Process the audio recording
    if (audioBlob) {
      await processAudioRecording();
    } else {
      // Move to next question if no audio
      moveToNextQuestion();
    }
  };

  const processAudioRecording = async () => {
    if (!audioBlob) return;

    try {
      // Validate audio
      if (!speechToTextService.validateAudioBlob(audioBlob)) {
        moveToNextQuestion();
        return;
      }

      // Convert audio to text
      const result = await speechToTextService.convertAudioToText(audioBlob);

      if (result.success && result.text) {
        // Save the answer
        const currentQuestion = getCurrentQuestion();
        if (currentQuestion) {
          const questionId =
            currentQuestion.id || currentQuestion.questionId || "";
          setTestState((prev) => ({
            ...prev,
            answers: {
              ...prev.answers,
              [questionId]: result.text!,
            },
            audioBlobs: {
              ...prev.audioBlobs,
              [questionId]: audioBlob!,
            },
          }));
        }

        toast.success("Cevabınız kaydedildi");
      } else {
        toast.error("Ses metne dönüştürülemedi, lütfen tekrar deneyin");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Ses işlenirken hata oluştu");
    } finally {
      // Reset recording and move to next question
      resetRecording();
      moveToNextQuestion();
    }
  };

  const moveToNextQuestion = async () => {
    if (!testData) return;

    const currentSection = testData.sections[testState.currentSectionIndex];
    const hasSubParts = currentSection.subParts.length > 0;

    if (hasSubParts) {
      const currentSubPart =
        currentSection.subParts[testState.currentSubPartIndex];
      const questionsInSubPart = currentSubPart.questions.length;

      if (testState.currentQuestionIndex < questionsInSubPart - 1) {
        // Next question in same subpart
        setTestState((prev) => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          phase: "preparation",
        }));
      } else if (
        testState.currentSubPartIndex <
        currentSection.subParts.length - 1
      ) {
        // Next subpart
        setTestState((prev) => ({
          ...prev,
          currentSubPartIndex: prev.currentSubPartIndex + 1,
          currentQuestionIndex: 0,
          phase: "preparation",
        }));
      } else if (testState.currentSectionIndex < testData.sections.length - 1) {
        // Next section
        setTestState((prev) => ({
          ...prev,
          currentSectionIndex: prev.currentSectionIndex + 1,
          currentSubPartIndex: 0,
          currentQuestionIndex: 0,
          phase: "preparation",
        }));
      } else {
        // Test completed - submit results
        await submitTestResults();
      }
    } else {
      const questionsInSection = currentSection.questions.length;

      if (testState.currentQuestionIndex < questionsInSection - 1) {
        // Next question in same section
        setTestState((prev) => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          phase: "preparation",
        }));
      } else if (testState.currentSectionIndex < testData.sections.length - 1) {
        // Next section
        setTestState((prev) => ({
          ...prev,
          currentSectionIndex: prev.currentSectionIndex + 1,
          currentQuestionIndex: 0,
          phase: "preparation",
        }));
      } else {
        // Test completed - submit results
        await submitTestResults();
      }
    }
  };

  const submitTestResults = async () => {
    if (!testData) return;

    try {
      setTestState((prev) => ({ ...prev, phase: "processing" }));

      // Format submission data
      const submissionData = speakingSubmissionService.formatSubmissionData(
        testData,
        testState.answers
      );

      // Validate submission data
      if (!speakingSubmissionService.validateSubmissionData(submissionData)) {
        setTestState((prev) => ({ ...prev, phase: "completed" }));
        return;
      }

      // Submit the test
      const result = await speakingSubmissionService.submitSpeakingTest(
        submissionData
      );

      if (result.success) {
        setTestState((prev) => ({ ...prev, phase: "completed" }));
        toast.success("Test başarıyla tamamlandı!");
      } else {
        toast.error(
          "Test gönderilemedi: " + (result.error || "Bilinmeyen hata")
        );
        setTestState((prev) => ({ ...prev, phase: "completed" }));
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Test gönderilirken hata oluştu");
      setTestState((prev) => ({ ...prev, phase: "completed" }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressInfo = () => {
    if (!testData) return { current: 0, total: 0, percentage: 0 };

    let totalQuestions = 0;
    let currentQuestionNumber = 0;
    let questionsPassed = 0;

    testData.sections.forEach((section, sectionIndex) => {
      if (section.subParts && section.subParts.length > 0) {
        section.subParts.forEach((subPart, subPartIndex) => {
          subPart.questions.forEach((_, questionIndex) => {
            totalQuestions++;

            if (sectionIndex < testState.currentSectionIndex) {
              questionsPassed++;
            } else if (sectionIndex === testState.currentSectionIndex) {
              if (subPartIndex < testState.currentSubPartIndex) {
                questionsPassed++;
              } else if (subPartIndex === testState.currentSubPartIndex) {
                if (questionIndex < testState.currentQuestionIndex) {
                  questionsPassed++;
                } else if (questionIndex === testState.currentQuestionIndex) {
                  currentQuestionNumber = questionsPassed + 1;
                }
              }
            }
          });
        });
      } else {
        section.questions.forEach((_, questionIndex) => {
          totalQuestions++;

          if (sectionIndex < testState.currentSectionIndex) {
            questionsPassed++;
          } else if (sectionIndex === testState.currentSectionIndex) {
            if (questionIndex < testState.currentQuestionIndex) {
              questionsPassed++;
            } else if (questionIndex === testState.currentQuestionIndex) {
              currentQuestionNumber = questionsPassed + 1;
            }
          }
        });
      }
    });

    const percentage =
      totalQuestions > 0 ? (questionsPassed / totalQuestions) * 100 : 0;

    return {
      current: currentQuestionNumber,
      total: totalQuestions,
      percentage: Math.round(percentage),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Test Yükleniyor
          </h2>
          <p className="text-gray-600">Konuşma testi hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Test Bulunamadı
          </h2>
          <p className="text-gray-600 mb-6">
            Aradığınız konuşma testi mevcut değil.
          </p>
          <Button
            onClick={() => navigate("/test")}
            className="bg-red-600 hover:bg-red-700"
          >
            Testlere Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  const context = getCurrentContext();
  const timingConfig = getTimingConfig();
  const progressInfo = getProgressInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/test")}
            className="mb-6 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Testlere Geri Dön
          </Button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                {testData.title}
              </h1>
              <p className="text-xl text-gray-600">Konuşma Testi</p>
            </div>

            <div className="flex items-center gap-4">
              {context && (
                <Badge
                  variant="secondary"
                  className="text-base px-4 py-2 rounded-full shadow-sm bg-white border-2 border-red-200 text-red-700"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {context.section.title}
                  {context.subPart && ` - ${context.subPart.label}`}
                </Badge>
              )}

              {progressInfo.total > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                  <span>İlerleme:</span>
                  <span className="font-bold text-gray-800">
                    {progressInfo.current}/{progressInfo.total}
                  </span>
                  <span className="text-red-600">
                    ({progressInfo.percentage}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {progressInfo.total > 0 &&
          testState.phase !== "instructions" &&
          testState.phase !== "loading" && (
            <div className="mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-gray-800">
                    Test İlerlemesi
                  </span>
                  <span className="text-sm text-gray-500 font-medium">
                    {progressInfo.current}/{progressInfo.total} soru
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${progressInfo.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto">
          {/* Instructions Phase */}
          {testState.phase === "instructions" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="max-w-2xl mx-auto text-center">
                <div className="mb-8">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mic className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Konuşma Testi
                  </h2>
                  <p className="text-gray-600">
                    Teste başlamadan önce bilgileri okuyun
                  </p>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800 mb-3">
                      Test Süreleri
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                        <span>
                          Bölüm 1: 5-10 saniye hazırlanma, 30 saniye cevap
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                        <span>
                          Bölüm 2-3: 1 dakika hazırlanma, 2 dakika cevap
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800 mb-3">
                      Önemli Notlar
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span>Mikrofon izni verin</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span>Sessiz ortamda test olun</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span>Kayıt sırasında duraklatabilirsiniz</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={startTest}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-base font-semibold rounded-lg"
                  size="lg"
                >
                  Teste Başla
                </Button>
              </div>
            </div>
          )}

          {/* Processing Phase */}
          {testState.phase === "processing" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Cevabınız İşleniyor
                </h2>
                <p className="text-gray-600">
                  Ses kaydınız metne dönüştürülüyor, lütfen bekleyin...
                </p>
              </div>
            </div>
          )}

          {/* Test Content */}
          {(testState.phase === "preparation" ||
            testState.phase === "recording") &&
            context && (
              <div className="space-y-6">
                {/* Timer */}
                {testState.phase === "preparation" && (
                  <Timer
                    duration={timingConfig.preparation}
                    onComplete={handlePreparationComplete}
                    type="preparation"
                    autoStart={true}
                    isActive={true}
                  />
                )}

                {/* Question Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {context.section.title}
                      {context.subPart && ` - ${context.subPart.label}`}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {context.section.description}
                    </p>
                  </div>

                  {context.question && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">Soru</h4>
                      <p className="text-gray-700 text-sm">
                        {context.question.description}
                      </p>

                      {context.question.images &&
                        context.question.images.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {context.question.images.map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`Question image ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Recording Controls */}
                {testState.phase === "recording" && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isRecording
                                ? "bg-red-500 animate-pulse"
                                : "bg-gray-300"
                            }`}
                          >
                            {isRecording ? (
                              <Mic className="h-5 w-5 text-white" />
                            ) : (
                              <MicOff className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {isRecording ? "Kayıt Yapılıyor" : "Kayıt Hazır"}
                          </p>
                          <p className="text-xs text-gray-600">
                            Süre: {formatTime(recordingTime)}
                          </p>
                        </div>
                      </div>

                      {audioUrl && (
                        <audio controls src={audioUrl} className="h-8" />
                      )}
                    </div>

                    {/* Recording Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={handlePauseRecording}
                        variant="outline"
                        size="sm"
                        className="px-4 py-2"
                        disabled={!isRecording && !isPaused}
                      >
                        {isPaused ? (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Devam Et
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Duraklat
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleSubmitAnswer}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                        size="sm"
                        disabled={!audioBlob && !isRecording && !isPaused}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Cevabı Gönder
                      </Button>
                    </div>

                    {recordingError && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <p className="text-red-600 text-sm">
                            {recordingError}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Completed Phase */}
          {testState.phase === "completed" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-green-800 mb-4">
                  Test Tamamlandı!
                </h2>

                <p className="text-green-700 mb-8">
                  Konuşma testiniz başarıyla tamamlandı. Sonuçlarınız
                  değerlendirilecek ve size bildirilecektir.
                </p>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => navigate("/test")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                  >
                    Testlere Geri Dön
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate("/profile")}
                    className="border-green-300 text-green-700 hover:bg-green-50 px-6 py-2"
                  >
                    Profilime Git
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeakingTest;
