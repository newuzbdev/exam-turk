import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import speechToTextService from "@/services/speechToText.service";
import speakingSubmissionService from "@/services/speakingSubmission.service";
import InstructionsPage from "./components/InstructionsPage";
import TestHeader from "./components/TestHeader";
import ProgressBar from "./components/ProgressBar";
import SectionRenderer from "./components/sections/SectionRenderer";
import { Mic } from "lucide-react";

interface Question {
  id: string;
  questionId?: string;
  questionText: string;
  order: number;
  sectionId?: string;
  subPartId?: string;
  pointId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubPart {
  id: string;
  sectionId: string;
  label: string;
  description: string;
  images: string[];
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  speakingTestId: string;
  title: string;
  content: string;
  description: string;
  images: string[];
  order: number;
  type: string;
  subParts: SubPart[];
  questions: Question[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SpeakingTestData {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
  sections: Section[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestState {
  currentSectionIndex: number;
  currentSubPartIndex: number;
  currentQuestionIndex: number;
  phase: "loading" | "instructions" | "test" | "completed";
  answers: Record<string, string>;
  audioBlobs: Record<string, Blob>;
  currentlyRecordingQuestionId: string | null;
  answeredQuestions: Set<string>;
  showNextQuestion: boolean;
  isPaused: boolean;
}

const SpeakingTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [testData, setTestData] = useState<SpeakingTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingDuration, setRecordingDuration] = useState(0); // Add this state
  const [testState, setTestState] = useState<TestState>({
    currentSectionIndex: 0,
    currentSubPartIndex: 0,
    currentQuestionIndex: 0,
    phase: "loading",
    answers: {},
    audioBlobs: {},
    currentlyRecordingQuestionId: null,
    answeredQuestions: new Set(),
    showNextQuestion: false,
    isPaused: false,
  });

  const { startRecording, stopRecording, pauseRecording, resumeRecording, audioBlob } = useAudioRecorder();
  
  // Effect to handle audio blob updates
  useEffect(() => {
    if (audioBlob && testState.currentlyRecordingQuestionId) {
      setTestState((prev) => ({
        ...prev,
        audioBlobs: {
          ...prev.audioBlobs,
          [prev.currentlyRecordingQuestionId!]: audioBlob
        },
        currentlyRecordingQuestionId: null,
        answeredQuestions: new Set([...prev.answeredQuestions, prev.currentlyRecordingQuestionId!]),
        isPaused: false,
      }));
    }
  }, [audioBlob, testState.currentlyRecordingQuestionId]);

  // Effect to track recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (testState.currentlyRecordingQuestionId && !testState.isPaused) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [testState.currentlyRecordingQuestionId, testState.isPaused]);

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  const fetchTestData = async () => {
    try {
      const response = await axiosPrivate.get(`/api/speaking-test/${testId}`);
      setTestData(response.data);
      setTestState((prev) => ({ ...prev, phase: "instructions" }));
    } catch (error) {
      console.error("Error fetching test data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    setTestState((prev) => ({ ...prev, phase: "test" }));
  };

  const handleRecordQuestion = async (questionId: string) => {
    try {
      // If this question is already being recorded, stop it
      if (testState.currentlyRecordingQuestionId === questionId) {
        stopRecording();
      } else {
        // If another question is being recorded, stop it first
        if (testState.currentlyRecordingQuestionId) {
          stopRecording();
        }
        
        // Reset recording duration
        setRecordingDuration(0);
        
        // Set the recording question ID first
        setTestState((prev) => ({
          ...prev,
          currentlyRecordingQuestionId: questionId,
          isPaused: false,
        }));
        
        // Start recording for this question
        await startRecording();
      }
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Kayıt başlatılamadı. Lütfen tekrar deneyin.");
      
      // Reset the recording state if there's an error
      setTestState((prev) => ({
        ...prev,
        currentlyRecordingQuestionId: null,
        isPaused: false,
      }));
    }
  };

  const handlePauseRecording = async () => {
    try {
      await pauseRecording();
      setTestState((prev) => ({ ...prev, isPaused: true }));
    } catch (error) {
      console.error("Pause error:", error);
    }
  };

  const handleResumeRecording = async () => {
    try {
      await resumeRecording();
      setTestState((prev) => ({ ...prev, isPaused: false }));
    } catch (error) {
      console.error("Resume error:", error);
    }
  };

  const handleStopRecording = async () => {
    try {
      stopRecording();
      // The audioBlob will be handled by the useEffect that watches audioBlob
    } catch (error) {
      console.error("Stop recording error:", error);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(""); // "converting" | "submitting" | "completed"

  const handleSubmitTest = async () => {
    try {
      setIsSubmitting(true);
      setSubmissionStep("converting");
      
      // Format submission data according to API requirements
      if (!testData) {
        toast.error("Test verisi bulunamadı");
        setIsSubmitting(false);
        return;
      }

      // Convert audio blobs to text
      const answers: Record<string, string> = {};
      
      // Process each recorded audio blob
      for (const [questionId, audioBlob] of Object.entries(testState.audioBlobs)) {
        // Convert audio to text
        const result = await speechToTextService.convertAudioToText(audioBlob);
        
        if (result.success && result.text) {
          answers[questionId] = result.text;
        } else {
          // If conversion fails, use a placeholder text
          answers[questionId] = "[Ses metne dönüştürülemedi]";
          console.warn(`Failed to convert audio for question ${questionId}:`, result.error);
        }
      }
      
      setSubmissionStep("submitting");
      
      const formattedData = speakingSubmissionService.formatSubmissionData(
        testData,
        answers
      );

      // Validate submission data
      if (!speakingSubmissionService.validateSubmissionData(formattedData)) {
        setIsSubmitting(false);
        return;
      }

      // Submit the test
      const result = await speakingSubmissionService.submitSpeakingTest(formattedData);
      
      if (result.success) {
        setSubmissionStep("completed");
        toast.success("Test başarıyla gönderildi");
        // Small delay to show completion before moving to next phase
        setTimeout(() => {
          setTestState((prev) => ({ ...prev, phase: "completed" }));
          setIsSubmitting(false);
        }, 1000);
      } else {
        toast.error(result.error || "Test gönderilirken hata oluştu");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Test gönderilirken hata oluştu");
      setIsSubmitting(false);
    }
  };

  // Helper function to get all questions from the test
  const getAllQuestions = () => {
    if (!testData) return [];
    
    const allQuestions: Array<{
      id: string;
      questionText: string;
      sectionTitle: string;
      sectionDescription: string;
      subPartLabel?: string;
      sectionIndex: number;
      subPartIndex?: number;
      questionIndex: number;
    }> = [];

    testData.sections.forEach((section, sectionIndex) => {
      if (section.subParts && section.subParts.length > 0) {
        section.subParts.forEach((subPart, subPartIndex) => {
          subPart.questions.forEach((question, questionIndex) => {
            allQuestions.push({
              id: question.id,
              questionText: question.questionText,
              sectionTitle: section.title,
              sectionDescription: section.description,
              subPartLabel: subPart.label,
              sectionIndex,
              subPartIndex,
              questionIndex,
            });
          });
        });
      } else {
        section.questions.forEach((question, questionIndex) => {
          allQuestions.push({
            id: question.id,
            questionText: question.questionText,
            sectionTitle: section.title,
            sectionDescription: section.description,
            sectionIndex,
            questionIndex,
          });
        });
      }
    });

    return allQuestions.sort((a, b) => {
      if (a.sectionIndex !== b.sectionIndex) return a.sectionIndex - b.sectionIndex;
      if (a.subPartIndex !== undefined && b.subPartIndex !== undefined) {
        if (a.subPartIndex !== b.subPartIndex) return a.subPartIndex - b.subPartIndex;
      }
      return a.questionIndex - b.questionIndex;
    });
  };

  const getProgressInfo = () => {
    const allQuestions = getAllQuestions();
    const answeredCount = testState.answeredQuestions.size;
    const totalCount = allQuestions.length;
    const percentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
    
    return {
      answered: answeredCount,
      total: totalCount,
      percentage,
      allQuestions,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping"></div>
            <div className="absolute inset-3 rounded-full bg-red-200 animate-ping animation-delay-500"></div>
            <div className="absolute inset-6 rounded-full bg-red-300 flex items-center justify-center">
              <Mic className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 text-lg">Test yükleniyor...</p>
          <p className="text-gray-500 text-sm mt-2">Konuşma soruları hazırlanıyor</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Test bulunamadı</p>
        </div>
      </div>
    );
  }

  if (testState.phase === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-12">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Test Tamamlandı!
            </h2>
            <p className="text-gray-600 mb-2">
              Konuşma testiniz başarıyla gönderildi.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Sonuçlar değerlendirildikten sonra size bildirilecektir.
            </p>
            <Button
              onClick={() => navigate("/test")}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-sm"
            >
              Test Sayfasına Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (testState.phase === "instructions") {
    return (
      <InstructionsPage
        testTitle={testData.title}
        onStartTest={handleStartTest}
        sections={testData.sections.map(section => ({
          title: section.title,
          description: section.description,
          type: section.type
        }))}
      />
    );
  }

  const progressInfo = getProgressInfo();

  return (
    <div className="min-h-screen bg-white">
      <TestHeader
        testTitle={testData.title}
        currentQuestion={progressInfo.answered + 1}
        totalQuestions={progressInfo.total}
        onBack={() => navigate("/test")}
      />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        <ProgressBar percentage={progressInfo.percentage} />

        {/* Current Question */}
        {testData.sections[testState.currentSectionIndex] && (
          <SectionRenderer
            section={testData.sections[testState.currentSectionIndex]}
            sectionIndex={testState.currentSectionIndex}
            totalSections={testData.sections.length}
            onNextSection={() => {
              if (testState.currentSectionIndex < testData.sections.length - 1) {
                setTestState(prev => ({
                  ...prev,
                  currentSectionIndex: prev.currentSectionIndex + 1,
                  currentSubPartIndex: 0,
                  currentQuestionIndex: 0
                }));
              }
            }}
            onRecord={handleRecordQuestion}
            onStop={handleStopRecording}
            onPause={handlePauseRecording}
            onResume={handleResumeRecording}
            isRecording={!!testState.currentlyRecordingQuestionId}
            isPaused={testState.isPaused}
            hasRecording={Object.keys(testState.audioBlobs).length > 0}
            currentlyRecordingQuestionId={testState.currentlyRecordingQuestionId}
            answeredQuestions={testState.answeredQuestions}
            recordingDuration={recordingDuration}
          />
        )}

        {testState.showNextQuestion && (
          <div className="text-center text-gray-600 text-sm py-4">
            <div className="inline-flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="mt-2">Sonraki soru yükleniyor...</p>
          </div>
        )}

        {/* Test Complete */}
        {progressInfo.answered === progressInfo.total && progressInfo.total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            {isSubmitting ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full animate-spin"></div>
                </div>
                
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  {submissionStep === "converting"
                    ? "Konuşmalarınız metne dönüştürülüyor..."
                    : submissionStep === "submitting"
                      ? "Test gönderiliyor..."
                      : "Tamamlanıyor..."}
                </h3>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mx-auto max-w-xs">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      submissionStep === "converting"
                        ? "bg-blue-500 w-1/3"
                        : submissionStep === "submitting"
                          ? "bg-yellow-500 w-2/3"
                          : "bg-green-500 w-full"
                    }`}
                  ></div>
                </div>
                
                <p className="text-green-700 text-sm">
                  {submissionStep === "converting"
                    ? "Ses kayıtlarınız metne dönüştürülüyor..."
                    : submissionStep === "submitting"
                      ? "Test sonuçlarınız gönderiliyor..."
                      : "Tamamlanıyor..."}
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  Tüm sorular tamamlandı!
                </h3>
                <p className="text-green-700 mb-5 text-sm">
                  Testi göndermek için aşağıdaki butona tıklayın.
                </p>
                <Button
                  onClick={handleSubmitTest}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 text-base rounded-lg"
                  disabled={Object.keys(testState.audioBlobs).length === 0}
                >
                  Testi Gönder
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakingTest;
