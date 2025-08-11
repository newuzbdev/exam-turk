import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Square, Play, Pause, ArrowLeft, CheckCircle, Info, Clock } from 'lucide-react';
import axiosPrivate from '@/config/api';
import { toast } from 'sonner';

interface Question {
  id: string;
  questionText: string;
  order: number;
  subPartId?: string;
  sectionId?: string;
}

interface SubPart {
  id: string;
  label: string;
  description: string;
  images: string[];
  questions: Question[];
}

interface Section {
  id: string;
  title: string;
  description: string;
  type: string;
  order: number;
  subParts: SubPart[];
  questions: Question[];
}

interface SpeakingTestData {
  id: string;
  title: string;
  sections: Section[];
}

interface Recording {
  blob: Blob;
  duration: number;
  questionId: string;
}

const ImprovedSpeakingTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [testData, setTestData] = useState<SpeakingTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSectionDescription, setShowSectionDescription] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Map<string, Recording>>(new Map());
  const [timeLeft, setTimeLeft] = useState(30); // Default 30 seconds per question
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlayingInstructions, setIsPlayingInstructions] = useState(false);
  const [autoRecordingEnabled, setAutoRecordingEnabled] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startSoundRef = useRef<HTMLAudioElement | null>(null);
  const endSoundRef = useRef<HTMLAudioElement | null>(null);

  // Load test data and initialize audio
  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
    
    // Initialize sound effects
    startSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V');
    endSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V');
  }, [testId]);

  const fetchTestData = async () => {
    try {
      const response = await axiosPrivate.get(`/api/speaking-test/${testId}`);
      setTestData(response.data);
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast.error('Test verisi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const playInstructionAudio = async (partNumber: number) => {
    try {
      setIsPlayingInstructions(true);
      const audioFile = `/speaking part${partNumber}.mp3`;
      audioRef.current = new Audio(audioFile);
      
      audioRef.current.onended = () => {
        setIsPlayingInstructions(false);
        // Auto start recording after instruction
        setTimeout(() => {
          if (!isRecording) {
            startRecording();
          }
        }, 1000);
      };
      
      audioRef.current.onerror = () => {
        setIsPlayingInstructions(false);
        toast.error('Ses talimatı oynatılamadı');
      };
      
      await audioRef.current.play();
    } catch (error) {
      setIsPlayingInstructions(false);
      console.error('Error playing instruction audio:', error);
    }
  };

  const playSound = (type: 'start' | 'end') => {
    try {
      if (type === 'start' && startSoundRef.current) {
        startSoundRef.current.currentTime = 0;
        startSoundRef.current.play().catch(console.error);
      } else if (type === 'end' && endSoundRef.current) {
        endSoundRef.current.currentTime = 0;
        endSoundRef.current.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Get current question
  const getCurrentQuestion = () => {
    if (!testData) return null;
    
    const section = testData.sections[currentSectionIndex];
    if (!section) return null;

    // Check if section has subParts and they exist
    if (section.subParts && section.subParts.length > 0) {
      const subPart = section.subParts[currentSubPartIndex];
      if (!subPart || !subPart.questions) return null;
      return subPart.questions[currentQuestionIndex] || null;
    } else {
      // Direct questions in section
      if (!section.questions || section.questions.length === 0) return null;
      return section.questions[currentQuestionIndex] || null;
    }
  };

  const currentQuestion = getCurrentQuestion();
  const currentSection = testData?.sections[currentSectionIndex];

  // Timer effects
  useEffect(() => {
    if (timeLeft > 0 && isRecording) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isRecording]);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Play start sound
      playSound('start');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Play end sound
        playSound('end');
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        if (currentQuestion) {
          const recording: Recording = {
            blob,
            duration: recordingTime,
            questionId: currentQuestion.id
          };
          
          setRecordings(prev => new Map(prev.set(currentQuestion.id, recording)));
          
          // Auto proceed to next question after 2 seconds
          setTimeout(() => {
            nextQuestion();
          }, 2000);
        }
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setAutoRecordingEnabled(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Mikrofon erişimi reddedildi');
    }
  };



  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const nextQuestion = () => {
    if (!testData || !currentSection) return;

    // Check if there are more questions in current subpart
    if (currentSection.subParts.length > 0) {
      const currentSubPart = currentSection.subParts[currentSubPartIndex];
      if (currentQuestionIndex < currentSubPart.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimeLeft(30);
        return;
      }
      
      // Check if there are more subparts
      if (currentSubPartIndex < currentSection.subParts.length - 1) {
        setCurrentSubPartIndex(currentSubPartIndex + 1);
        setCurrentQuestionIndex(0);
        setTimeLeft(30);
        return;
      }
    } else {
      // Direct questions in section
      if (currentQuestionIndex < currentSection.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimeLeft(30);
        return;
      }
    }

    // Move to next section
    if (currentSectionIndex < testData.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentSubPartIndex(0);
      setCurrentQuestionIndex(0);
      setShowSectionDescription(true);
      setTimeLeft(30);
    } else {
      // Test is complete
      console.log('Test completed! Total recordings:', recordings.size);
      setIsTestComplete(true);
    }
  };

  const startSection = () => {
    setShowSectionDescription(false);
    setTimeLeft(30);
    
    // Play instruction audio for current section
    const partNumber = currentSectionIndex + 1;
    playInstructionAudio(partNumber);
  };

  const submitTest = async () => {
    if (!testData) return;
    
    setIsSubmitting(true);
    try {
      toast.info('Konuşmalarınız metne dönüştürülüyor...');
      
      // Convert recordings to text first
      const questionAnswers = new Map<string, string>();
      
      for (const [questionId, recording] of recordings) {
        try {
          const formData = new FormData();
          formData.append('audio', recording.blob, 'recording.webm');
          
          const response = await axiosPrivate.post('/api/speaking-submission/speech-to-text', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          });
          
          const userAnswer = response.data?.text || '[Ses metne dönüştürülemedi]';
          questionAnswers.set(questionId, userAnswer);
          
        } catch (error) {
          console.error('Speech to text error for question:', questionId, error);
          questionAnswers.set(questionId, '[Ses metne dönüştürülemedi]');
        }
      }

      toast.info('Test gönderiliyor...');
      
      // Format submission data according to API structure
      const submissionData = {
        speakingTestId: testData.id,
        parts: testData.sections.map((section, ) => {
          const part: any = {
            description: section.description,
            image: "", // Section does not have images property
          };

          if (section.subParts && section.subParts.length > 0) {
            // Section with subParts
            part.subParts = section.subParts.map(subPart => ({
              image: subPart.images?.[0] || "",
              questions: subPart.questions.map(question => ({
                questionId: question.id,
                userAnswer: questionAnswers.get(question.id) || '[Cevap bulunamadı]'
              }))
            }));
          } else {
            // Section with direct questions
            part.questions = section.questions.map(question => ({
              questionId: question.id,
              userAnswer: questionAnswers.get(question.id) || '[Cevap bulunamadı]'
            }));
            
            // Add type for Part 3 if needed
            if (section.type === 'PART3') {
              part.type = 'DISADVANTAGE'; // or whatever type is appropriate
            }
          }

          return part;
        })
      };

      console.log('Submitting data:', submissionData);
      
      // Submit the processed data
      await axiosPrivate.post('/api/speaking-submission', submissionData);
      
      toast.success('Test başarıyla gönderildi!');
      navigate('/test');
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Test gönderilirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl text-black">Test yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-black">Test bulunamadı</p>
          <button
            onClick={() => navigate('/test')}
            className="mt-4 bg-red-600 text-white px-6 py-3 rounded"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (isTestComplete) {
    console.log('Showing completion page - recordings:', recordings.size, 'testData:', testData?.title);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-4">Test Tamamlandı!</h1>
          <p className="text-lg text-black mb-6">
            {recordings.size} soru cevaplanmıştır.
          </p>
          <div className="space-y-3">
            <button
              onClick={submitTest}
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white font-bold py-4 px-6 text-lg rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Testi Gönder'}
            </button>
            <button
              onClick={() => navigate('/test')}
              className="w-full border-2 border-red-600 text-red-600 font-bold py-4 px-6 text-lg rounded hover:bg-red-600 hover:text-white"
            >
              Test Sayfasına Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show section description
  if (showSectionDescription && currentSection) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b border-red-600">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/test')}
                className="flex items-center text-red-600 hover:text-red-700"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="text-lg font-bold">Geri</span>
              </button>
              <h1 className="text-2xl font-bold text-black">{testData.title}</h1>
              <div className="text-lg text-black">
                Bölüm {currentSectionIndex + 1} / {testData.sections.length}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white border-2 border-red-600 rounded-lg p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-full text-lg font-bold mb-4">
                <Info className="w-5 h-5 mr-2" />
                {currentSection.title}
              </div>
              <h2 className="text-3xl font-bold text-black mb-6">Bölüm Açıklaması</h2>
              <div className="text-lg text-black leading-relaxed whitespace-pre-line max-w-3xl mx-auto">
                {currentSection.description}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={startSection}
              className="bg-red-600 text-white font-bold py-4 px-8 text-xl rounded-lg hover:bg-red-700 shadow-lg"
            >
              Bölümü Başlat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show question interface
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-600 rounded-full mx-auto flex items-center justify-center">
            <span className="text-white text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-black">Soru Bulunamadı</h2>
          <p className="text-gray-600">
            Bölüm {currentSectionIndex + 1}, Alt Bölüm {currentSubPartIndex + 1}, Soru {currentQuestionIndex + 1}
          </p>
          <button
            onClick={nextQuestion}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Sonraki Soruya Geç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-red-600">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/test')}
              className="flex items-center text-red-600 hover:text-red-700"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-lg font-bold">Geri</span>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-black">{testData.title}</h1>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                  {currentSection?.title}
                </div>
                <span className="text-sm text-gray-600">•</span>
                <span className="text-sm text-gray-600">
                  Soru {currentQuestionIndex + 1}
                </span>
              </div>
            </div>
            <div className="text-lg font-bold text-black">
              Bölüm {currentSectionIndex + 1} / {testData.sections.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Question Card */}
        <div className="bg-white border-2 border-red-600 rounded-lg p-8 mb-6">
          {/* Show images if available */}
          {currentSection?.subParts && currentSection.subParts[currentSubPartIndex]?.images && 
           currentSection.subParts[currentSubPartIndex].images.length > 0 && (
            <div className="mb-6">
              <img 
                src={currentSection.subParts[currentSubPartIndex].images[0]} 
                alt="Test görseli" 
                className="max-w-md mx-auto rounded-lg shadow-lg"
              />
            </div>
          )}
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-black leading-relaxed">
              {currentQuestion.questionText}
            </h2>
          </div>
          
          {/* Debug info - remove in production */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Debug: Section {currentSectionIndex + 1}, SubPart {currentSubPartIndex + 1}, Question {currentQuestionIndex + 1}
          </div>
        </div>

        {/* Status Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-600 text-white rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-white" />
            <div className="text-sm font-bold">Kalan Süre</div>
            <div className="text-2xl font-bold text-white">{formatTime(timeLeft)}</div>
          </div>
          
          <div className="bg-white border-2 border-red-600 rounded-lg p-4 text-center">
            <div className="w-6 h-6 mx-auto mb-2 bg-red-600 rounded-full"></div>
            <div className="text-sm font-bold text-black">Kayıt Süresi</div>
            <div className="text-2xl font-bold text-red-600">{formatTime(recordingTime)}</div>
          </div>
          
          <div className="bg-white border-2 border-red-600 rounded-lg p-4 text-center">
            <div className="w-6 h-6 mx-auto mb-2">
              {isRecording ? (
                <div className="w-6 h-6 bg-red-600 rounded-full animate-pulse"></div>
              ) : recordings.has(currentQuestion.id) ? (
                <CheckCircle className="w-6 h-6 text-red-600" />
              ) : (
                <div className="w-6 h-6 border-2 border-red-600 rounded-full"></div>
              )}
            </div>
            <div className="text-sm font-bold text-black">Durum</div>
            <div className="text-lg font-bold">
              {isPlayingInstructions ? (
                <span className="text-blue-600">TALİMAT</span>
              ) : isRecording ? (
                <span className="text-red-600">KAYIT</span>
              ) : recordings.has(currentQuestion.id) ? (
                <span className="text-red-600">TAMAM</span>
              ) : (
                <span className="text-black">HAZIR</span>
              )}
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="text-center mb-6">
          {isPlayingInstructions ? (
            <div className="space-y-4">
              <div className="text-6xl">🔊</div>
              <p className="text-2xl font-bold text-black">Talimat dinleniyor...</p>
            </div>
          ) : !isRecording ? (
            <div className="space-y-4">
              <button
                onClick={startRecording}
                disabled={isPlayingInstructions}
                className="bg-red-600 text-white p-6 rounded-full hover:bg-red-700 shadow-lg disabled:opacity-50"
              >
                <Mic className="w-10 h-10" />
              </button>
              <p className="text-lg font-bold text-black">Konuşmaya başlamak için tıklayın</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center items-center space-x-4">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 text-white p-4 rounded-full hover:bg-gray-700"
                >
                  <Square className="w-8 h-8" />
                </button>
              </div>
              <p className="text-xl font-bold text-red-600">🔴 Kayıt devam ediyor...</p>
              <p className="text-sm text-gray-600">Bitirmek için durdur butonuna tıklayın</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsTestComplete(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Test Bitir (Debug)
          </button>
          
          <div className="text-center">
            {recordings.has(currentQuestion.id) && (
              <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                ✓ Cevaplandı
              </div>
            )}
          </div>

          <button
            onClick={nextQuestion}
            disabled={isRecording}
            className={`px-6 py-3 text-lg font-bold rounded-lg ${
              isRecording
                ? 'bg-red-600 text-white opacity-50 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Sonraki →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImprovedSpeakingTest;
