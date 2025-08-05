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
import QuestionCard from "./components/QuestionCard";

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

interface Section {
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

  const { startRecording, stopRecording, pauseRecording, resumeRecording, isRecording } = useAudioRecorder();

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
        const blob = await stopRecording();
        setTestState((prev) => ({
          ...prev,
          audioBlobs: { ...prev.audioBlobs, [questionId]: blob },
          currentlyRecordingQuestionId: null,
          answeredQuestions: new Set([...prev.answeredQuestions, questionId]),
          isPaused: false,
        }));
      } else {
        // If another question is being recorded, stop it first
        if (testState.currentlyRecordingQuestionId) {
          const blob = await stopRecording();
          setTestState((prev) => ({
            ...prev,
            audioBlobs: { ...prev.audioBlobs, [prev.currentlyRecordingQuestionId!]: blob },
            isPaused: false,
          }));
        }
        
        // Start recording for this question
        await startRecording();
        setTestState((prev) => ({
          ...prev,
          currentlyRecordingQuestionId: questionId,
          isPaused: false,
        }));
      }
    } catch (error) {
      console.error("Recording error:", error);
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
      const blob = await stopRecording();
      if (testState.currentlyRecordingQuestionId) {
        setTestState((prev) => ({
          ...prev,
          audioBlobs: { ...prev.audioBlobs, [prev.currentlyRecordingQuestionId!]: blob },
          currentlyRecordingQuestionId: null,
          answeredQuestions: new Set([...prev.answeredQuestions, prev.currentlyRecordingQuestionId!]),
          isPaused: false,
        }));
      }
    } catch (error) {
      console.error("Stop recording error:", error);
    }
  };

  const handleNextQuestion = () => {
    setTestState((prev) => ({
      ...prev,
      showNextQuestion: true,
    }));
    setTimeout(() => {
      setTestState((prev) => ({
        ...prev,
        showNextQuestion: false,
      }));
    }, 1000);
  };

  const handleSubmitTest = async () => {
    try {
      // Submit all recorded answers
      const submissionData = {
        speakingTestId: testId,
        answers: testState.answers,
        audioBlobs: testState.audioBlobs,
      };

      await speakingSubmissionService.createSubmission(submissionData);
      toast.success("Test başarıyla gönderildi");
      setTestState((prev) => ({ ...prev, phase: "completed" }));
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Test gönderilirken hata oluştu");
    }
  };

  // Helper function to get all questions from the test
  const getAllQuestions = () => {
    if (!testData) return [];
    
    const allQuestions: Array<{
      id: string;
      questionText: string;
      sectionTitle: string;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Test yükleniyor...</p>
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Test Tamamlandı!
            </h2>
            <p className="text-gray-600 mb-6">
              Konuşma testiniz başarıyla gönderildi.
            </p>
            <Button
              onClick={() => navigate("/test")}
              className="bg-red-600 hover:bg-red-700 text-white"
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
      />
    );
  }

  const progressInfo = getProgressInfo();
  const currentQuestion = progressInfo.allQuestions[progressInfo.answered];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        <TestHeader
          testTitle={testData.title}
          currentQuestion={progressInfo.answered + 1}
          totalQuestions={progressInfo.total}
          onBack={() => navigate("/test")}
        />

        <ProgressBar percentage={progressInfo.percentage} />

        {/* Current Question */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            isRecording={testState.currentlyRecordingQuestionId === currentQuestion.id}
            isPaused={testState.isPaused}
            hasRecording={!!testState.audioBlobs[currentQuestion.id]}
            onRecord={() => handleRecordQuestion(currentQuestion.id)}
            onPause={handlePauseRecording}
            onResume={handleResumeRecording}
            onStop={handleStopRecording}
            onNext={handleNextQuestion}
            showNextButton={
              !!testState.audioBlobs[currentQuestion.id] && 
              progressInfo.answered < progressInfo.total - 1
            }
          />
        )}

        {testState.showNextQuestion && (
          <div className="text-center text-gray-600 text-sm">
            Sonraki soru yükleniyor...
          </div>
        )}

        {/* Test Complete */}
        {progressInfo.answered === progressInfo.total && progressInfo.total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Tüm sorular tamamlandı!
            </h3>
            <p className="text-green-700 text-sm mb-4">
              Testi göndermek için aşağıdaki butona tıklayın.
            </p>
          </div>
        )}

        {/* Submit Button */}
        {progressInfo.answered === progressInfo.total && progressInfo.total > 0 && (
          <div className="text-center mt-6">
            <Button
              onClick={handleSubmitTest}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              disabled={Object.keys(testState.audioBlobs).length === 0}
            >
              Testi Gönder
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakingTest;
