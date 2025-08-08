import { useState, useEffect, useRef } from 'react';
import {  useNavigate } from 'react-router-dom';
import { Mic, Square, Play, Pause, ArrowLeft, CheckCircle, Clock, User } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  section: string;
  timeLimit: number; // in seconds
}

interface Recording {
  blob: Blob;
  duration: number;
  timestamp: Date;
}

const NewSpeakingTest = () => {
  const navigate = useNavigate();
  
  // Test data (this would come from API)
  const [questions] = useState<Question[]>([
    {
      id: '1',
      text: 'Kendinizi tanıtır mısınız? Adınız nedir ve nerelisiniz?',
      section: 'Kişisel Bilgiler',
      timeLimit: 60
    },
    {
      id: '2', 
      text: 'Türkiye\'de en sevdiğiniz şehir hangisidir ve neden?',
      section: 'Genel Konular',
      timeLimit: 90
    },
    {
      id: '3',
      text: 'Gelecekteki planlarınızdan bahseder misiniz?',
      section: 'Gelecek Planları',
      timeLimit: 120
    }
  ]);

  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordings, setRecordings] = useState<Map<string, Recording>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize timer for current question
  useEffect(() => {
    if (currentQuestion && !isTestComplete) {
      setTimeLeft(currentQuestion.timeLimit);
      setRecordingTime(0);
    }
  }, [currentQuestion, isTestComplete]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && isRecording && !isPaused) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRecording) {
      // Auto stop recording when time is up
      stopRecording();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isRecording, isPaused]);

  // Recording time tracker
  useEffect(() => {
    if (isRecording && !isPaused) {
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
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
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
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const recording: Recording = {
          blob,
          duration: recordingTime,
          timestamp: new Date()
        };
        
        setRecordings(prev => new Map(prev.set(currentQuestion.id, recording)));
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarınızı kontrol edin.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsTestComplete(true);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitTest = () => {
    // Here you would submit the recordings to the server
    console.log('Submitting recordings:', recordings);
    navigate('/test-results');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  if (isTestComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-black mb-6">Test Tamamlandı!</h1>
          <p className="text-2xl text-black mb-8">
            {recordings.size} soru başarıyla cevaplanmıştır.
          </p>
          <div className="space-y-4">
            <button
              onClick={submitTest}
              className="w-full bg-red-600 text-white font-bold py-6 px-8 text-2xl rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Testi Gönder
            </button>
            <button
              onClick={() => navigate('/test')}
              className="w-full border-2 border-black text-black font-bold py-6 px-8 text-2xl rounded-lg hover:bg-black hover:text-white transition-all duration-200"
            >
              Test Sayfasına Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-black">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/test')}
              className="flex items-center text-black hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span className="text-xl font-bold">Geri</span>
            </button>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-black">Konuşma Testi</h1>
              <p className="text-lg text-black mt-1">Soru {currentQuestionIndex + 1} / {questions.length}</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-black">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="w-full bg-black h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-black p-12 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-red-600 text-white px-6 py-2 rounded-full text-lg font-bold mb-6">
              <User className="w-5 h-5 mr-2" />
              {currentQuestion.section}
            </div>
            <h2 className="text-5xl font-bold text-black leading-relaxed max-w-4xl mx-auto">
              {currentQuestion.text}
            </h2>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Time Remaining */}
          <div className="bg-black text-white rounded-2xl p-8 text-center shadow-lg">
            <Clock className="w-8 h-8 mx-auto mb-3 text-red-600" />
            <div className="text-lg font-bold mb-2 text-white">Kalan Süre</div>
            <div className="text-4xl font-bold text-red-600">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Recording Time */}
          <div className="bg-white border-2 border-black rounded-2xl p-8 text-center shadow-lg">
            <div className="w-8 h-8 mx-auto mb-3 bg-red-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div className="text-lg font-bold text-black mb-2">Kayıt Süresi</div>
            <div className="text-4xl font-bold text-red-600">
              {formatTime(recordingTime)}
            </div>
          </div>

          {/* Status */}
          <div className="bg-white border-2 border-black rounded-2xl p-8 text-center shadow-lg">
            <div className="w-8 h-8 mx-auto mb-3">
              {isRecording ? (
                <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse"></div>
              ) : recordings.has(currentQuestion.id) ? (
                <CheckCircle className="w-8 h-8 text-red-600" />
              ) : (
                <div className="w-8 h-8 border-2 border-black rounded-full"></div>
              )}
            </div>
            <div className="text-lg font-bold text-black mb-2">Durum</div>
            <div className="text-2xl font-bold">
              {isRecording ? (
                <span className="text-red-600">
                  {isPaused ? 'DURAKLADI' : 'KAYIT EDİYOR'}
                </span>
              ) : recordings.has(currentQuestion.id) ? (
                <span className="text-red-600">TAMAMLANDI</span>
              ) : (
                <span className="text-black">HAZIR</span>
              )}
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center space-x-8">
            
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-red-600 text-white p-8 rounded-full hover:bg-red-700 transition-all duration-200 shadow-2xl hover:shadow-red-500/25 hover:scale-105"
              >
                <Mic className="w-16 h-16" />
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button
                    onClick={pauseRecording}
                    className="bg-black text-white p-6 rounded-full hover:bg-red-600 transition-all duration-200 shadow-xl hover:scale-105"
                  >
                    <Pause className="w-12 h-12" />
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    className="bg-red-600 text-white p-6 rounded-full hover:bg-red-700 transition-all duration-200 shadow-xl hover:scale-105"
                  >
                    <Play className="w-12 h-12" />
                  </button>
                )}
                
                <button
                  onClick={stopRecording}
                  className="bg-black text-white p-6 rounded-full hover:bg-red-600 transition-all duration-200 shadow-xl hover:scale-105"
                >
                  <Square className="w-12 h-12" />
                </button>
              </>
            )}
          </div>

          <div className="mt-8">
            {!isRecording ? (
              <p className="text-2xl font-bold text-black">Kayıt başlatmak için mikrofon butonuna tıklayın</p>
            ) : isPaused ? (
              <p className="text-2xl font-bold text-red-600">Kayıt duraklatıldı - Devam etmek için ▶ butonuna tıklayın</p>
            ) : (
              <p className="text-2xl font-bold text-red-600">🔴 Kayıt devam ediyor...</p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            className={`px-10 py-5 text-xl font-bold rounded-xl transition-all duration-200 ${
              currentQuestionIndex === 0 
                ? 'border-2 border-black text-black opacity-50 cursor-not-allowed'
                : 'border-2 border-black text-black hover:bg-black hover:text-white shadow-lg hover:shadow-xl'
            }`}
          >
            ← Önceki
          </button>

          <div className="text-xl font-bold text-center">
            {recordings.has(currentQuestion.id) && (
              <div className="bg-red-600 text-white px-6 py-3 rounded-full">
                ✓ Cevaplandı
              </div>
            )}
          </div>

          <button
            onClick={nextQuestion}
            disabled={isRecording}
            className={`px-10 py-5 text-xl font-bold rounded-xl transition-all duration-200 ${
              isRecording
                ? 'bg-black text-white opacity-50 cursor-not-allowed'
                : currentQuestionIndex === questions.length - 1
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                  : 'bg-black text-white hover:bg-red-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Bitir →' : 'Sonraki →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewSpeakingTest;
