import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { findOneSpeakingTest } from "../../../speakingTestService";
import speakingSubmissionService, {
  type SpeakingSubmissionData,
} from "@/services/speakingSubmission.service";
import speechToTextService from "@/services/speechToText.service";

interface SpeakingTestDemoProps {
  testId: string;
  onTestComplete?: (submissionId: string) => void;
}

interface TestQuestion {
  id: string;
  text: string;
  duration?: number;
}

interface TestSubPart {
  id: string;
  image?: string;
  duration?: number;
  questions: TestQuestion[];
}

interface TestPart {
  id: string;
  description: string;
  image?: string;
  type?: string;
  duration?: number;
  subParts?: TestSubPart[];
  questions?: TestQuestion[];
}

interface SpeakingTestData {
  id: string;
  title: string;
  sections: TestPart[];
}

const SpeakingTestDemo = ({
  testId,
  onTestComplete,
}: SpeakingTestDemoProps) => {
  const [testData, setTestData] = useState<SpeakingTestData | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch test data on component mount
  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setIsLoading(true);
        const data = await findOneSpeakingTest(testId);
        setTestData(data);

        // Initialize timer for first question
        if (data.sections?.[0]) {
          const firstPart = data.sections[0];
          if (firstPart.subParts?.[0]) {
            setTimeLeft(firstPart.subParts[0].duration || 60);
          } else if (firstPart.duration) {
            setTimeLeft(firstPart.duration);
          }
        }
      } catch (error) {
        toast.error("Test yüklenirken hata oluştu");
        console.error("Error fetching test:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestData();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const getCurrentPart = () => testData?.sections[currentPartIndex];
  const getCurrentSubPart = () =>
    getCurrentPart()?.subParts?.[currentSubPartIndex];
  const getCurrentQuestion = () => {
    const subPart = getCurrentSubPart();
    if (subPart) {
      return subPart.questions[currentQuestionIndex];
    }
    return getCurrentPart()?.questions?.[currentQuestionIndex];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioBlob(event.data);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.success("Kayıt başladı");
    } catch (error) {
      toast.error("Mikrofon erişimi reddedildi");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      toast.success("Kayıt durduruldu");
    }
  };

  const processAudioToText = async () => {
    if (!audioBlob) {
      toast.error("Ses kaydı bulunamadı");
      return;
    }

    try {
      const result = await speechToTextService.convertAudioToText(audioBlob);
      if (result.success && result.text) {
        const currentQ = getCurrentQuestion();
        if (currentQ) {
          setAnswers((prev) => ({
            ...prev,
            [currentQ.id]: result.text!,
          }));
          toast.success("Ses metne dönüştürüldü");
        }
      } else {
        toast.error(result.error || "Ses metne dönüştürülemedi");
      }
    } catch (error) {
      toast.error("Ses işlenirken hata oluştu");
    }
  };

  const moveToNextQuestion = () => {
    const currentPart = getCurrentPart();
    if (!currentPart) return;

    const currentSubPart = getCurrentSubPart();

    if (currentSubPart) {
      // We're in a subpart
      if (currentQuestionIndex < currentSubPart.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else if (
        currentSubPartIndex <
        (currentPart.subParts?.length || 0) - 1
      ) {
        setCurrentSubPartIndex(currentSubPartIndex + 1);
        setCurrentQuestionIndex(0);
        setTimeLeft(
          currentPart.subParts?.[currentSubPartIndex + 1]?.duration || 60
        );
      } else {
        moveToNextPart();
      }
    } else {
      // We're in a part without subparts
      if (currentQuestionIndex < (currentPart.questions?.length || 0) - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        moveToNextPart();
      }
    }
  };

  const moveToNextPart = () => {
    if (!testData) return;

    if (currentPartIndex < testData.sections.length - 1) {
      setCurrentPartIndex(currentPartIndex + 1);
      setCurrentSubPartIndex(0);
      setCurrentQuestionIndex(0);

      const nextPart = testData.sections[currentPartIndex + 1];
      if (nextPart.subParts?.[0]) {
        setTimeLeft(nextPart.subParts[0].duration || 60);
      } else if (nextPart.duration) {
        setTimeLeft(nextPart.duration);
      }
    } else {
      // Test completed
      submitTest();
    }
  };

  const submitTest = async () => {
    if (!testData) return;

    setIsSubmitting(true);
    try {
      const submissionData: SpeakingSubmissionData =
        speakingSubmissionService.formatSubmissionData(testData, answers);

      if (!speakingSubmissionService.validateSubmissionData(submissionData)) {
        return;
      }

      const result = await speakingSubmissionService.submitSpeakingTest(
        submissionData
      );

      if (result.success) {
        // toast.success("Test başarıyla gönderildi!");
        if (onTestComplete && result.submissionId) {
          onTestComplete(result.submissionId);
        }
      } else {
        // toast.error(result.error || "Test gönderilemedi");
      }
    } catch (error) {
      // toast.error("Test gönderilirken hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
  
          <p>Test yükleniyor...</p>
     
    );
  }

  if (!testData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="text-red-600">Test verileri yüklenemedi</p>
        </CardContent>
      </Card>
    );
  }

  const currentPart = getCurrentPart();
  const currentQuestion = getCurrentQuestion();
  const currentSubPart = getCurrentSubPart();
  const progress = ((currentPartIndex + 1) / testData.sections.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">{testData.title}</h2>
            <Badge variant="outline">
              Bölüm {currentPartIndex + 1} / {testData.sections.length}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>

      {/* Current Part */}
      {currentPart && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Bölüm {currentPartIndex + 1}</span>
              {timeLeft > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  <Clock className="h-4 w-4 mr-1" />
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </Badge>
              )}
            </CardTitle>
            <p className="text-gray-600">{currentPart.description}</p>
          </CardHeader>
          <CardContent>
            {/* Part Image */}
            {currentPart.image && (
              <div className="mb-4">
                <img
                  src={currentPart.image}
                  alt="Test görseli"
                  className="w-full max-w-md mx-auto rounded-lg"
                />
              </div>
            )}

            {/* SubPart Image */}
            {currentSubPart?.image && (
              <div className="mb-4">
                <img
                  src={currentSubPart.image}
                  alt="Alt bölüm görseli"
                  className="w-full max-w-md mx-auto rounded-lg"
                />
              </div>
            )}

            {/* Current Question */}
            {currentQuestion && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">
                  Soru {currentQuestionIndex + 1}:
                </h3>
                <p className="text-gray-700">{currentQuestion.text}</p>
              </div>
            )}

            {/* Answer Display */}
            {currentQuestion && answers[currentQuestion.id] && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Cevabınız:</span>
                </div>
                <p className="text-green-700">{answers[currentQuestion.id]}</p>
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex gap-4 items-center justify-center">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Kayıt Başlat
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Kayıt Durdur
                </Button>
              )}

              {audioBlob && (
                <Button
                  onClick={processAudioToText}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Metne Dönüştür
                </Button>
              )}

              <Button onClick={moveToNextQuestion} disabled={isSubmitting}>
                {currentPartIndex === testData.sections.length - 1 &&
                (!currentSubPart ||
                  currentSubPartIndex ===
                    (currentPart.subParts?.length || 0) - 1) &&
                currentQuestionIndex ===
                  ((currentSubPart?.questions || currentPart.questions)
                    ?.length || 0) -
                    1
                  ? "Testi Bitir"
                  : "Sonraki Soru"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Status */}
      {isSubmitting && (
        <Card>
          <CardContent className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p>Test gönderiliyor...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpeakingTestDemo;
