import { Mic, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSuccess: () => void;
}

// 3. There was no cleanup of MediaRecorder or MediaStream after recording, which could cause issues on repeated recordings.

export const MicrophoneCheck = ({ onSuccess }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // We'll store the current MediaRecorder and MediaStream for cleanup
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check for MediaRecorder support
  const isMediaRecorderSupported =
    typeof window !== "undefined" && "MediaRecorder" in window;

  // Request mic permission on mount, but do not keep stream alive.
  useEffect(() => {
    // Debug mobile environmentno
    console.log("🔍 Mobile Debug Info:", {
      userAgent: navigator.userAgent,
      isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
      mediaDevices: !!navigator.mediaDevices,
      mediaRecorder: !!window.MediaRecorder,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia
    });

    // Only check permission, don't keep stream alive
    const checkMic = async () => {
      try {
        console.log("🔍 Checking microphone permission...");
        console.log("🔍 Available devices:", await navigator.mediaDevices.enumerateDevices());
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Microphone permission granted");
        console.log("🔍 Audio tracks:", stream.getAudioTracks());
        
        // Immediately stop the test stream
        stream.getTracks().forEach(track => track.stop());
        setError(null);
      } catch (error) {
        console.error("❌ Microphone permission denied:", error);
        
        let errorMessage = "Mikrofon izni verilmedi veya mikrofon bulunamadı.";
        
        if (error instanceof Error) {
          console.log("🔍 Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          if (error.name === 'NotAllowedError') {
            errorMessage = "Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin ve sayfayı yenileyin.";
          } else if (error.name === 'NotFoundError') {
            errorMessage = "Mikrofon bulunamadı. Lütfen mikrofonunuzun bağlı olduğundan emin olun.";
          } else if (error.name === 'NotSupportedError') {
            errorMessage = "Bu tarayıcı mikrofon kaydını desteklemiyor. Lütfen Chrome veya Safari kullanın.";
          } else if (error.name === 'NotReadableError') {
            errorMessage = "Mikrofon başka bir uygulama tarafından kullanılıyor. Lütfen diğer uygulamaları kapatın.";
          }
        }
        
        setError(errorMessage);
      }
    };
    if (isMediaRecorderSupported) {
      checkMic();
    } else {
      console.error("❌ MediaRecorder not supported");
      setError("Tarayıcınız mikrofonla kayıt almayı desteklemiyor.");
    }
    // Cleanup on unmount
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  const startRecording = async () => {
    setError(null);
    setAudioUrl(null);
    
    console.log("🎤 Starting recording...");
    console.log("MediaRecorder supported:", isMediaRecorderSupported);
    
    if (!isMediaRecorderSupported) {
      setError("Tarayıcınız mikrofonla kayıt almayı desteklemiyor.");
      return;
    }

    // Check if we're on HTTPS or localhost
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!isSecure) {
      console.warn("⚠️ Warning: Using HTTP instead of HTTPS. Microphone access may not work on mobile devices.");
      // Don't return early - try to continue for development
    }

    try {
      console.log("🔊 Requesting microphone access...");
      // Request microphone with better mobile support
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log("✅ Microphone access granted");
      streamRef.current = stream;
      chunksRef.current = [];

      // Try different MIME types for better mobile compatibility
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
      }
      
      console.log("🎵 Using MIME type:", mimeType);
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        console.log("📊 Data available:", e.data.size, "bytes");
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log("⏹️ Recording stopped, creating blob...");
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        console.log("🔗 Audio URL created:", url);
        setAudioUrl(url);
        // Stop all tracks after recording
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.onerror = (e) => {
        console.error("❌ Recording error:", e);
        setError("Kayıt sırasında bir hata oluştu.");
        setRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      console.log("▶️ Starting MediaRecorder...");
      recorder.start(100); // Collect data every 100ms for better mobile performance
      setRecording(true);
      console.log("✅ Recording started successfully");
    } catch (error) {
      console.error("❌ Recording failed:", error);
      let errorMessage = "Mikrofon izni verilmedi veya mikrofon bulunamadı.";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Mikrofon bulunamadı. Lütfen mikrofonunuzun bağlı olduğundan emin olun.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Bu tarayıcı mikrofon kaydını desteklemiyor.";
        }
      }
      
      setError(errorMessage);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setRecording(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-center mb-8 sm:mb-12">
          <img 
            src="/logo.png" 
            alt="TURKISHMOCK" 
            className="h-24 sm:h-32 md:h-40 lg:h-48 xl:h-56 w-auto object-contain"
            onError={(e) => {
              console.error("Logo failed to load");
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        <div className="space-y-6 sm:space-y-8">

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-start">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-rose-300 flex items-center justify-center">
                <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 text-slate-700">
                Mikrofon kontrolü
              </h2>
              <p className="mb-4 text-sm sm:text-base text-gray-600">
                Sınava başlamadan önce mikrofonunuzun düzgün çalıştığından emin olun. Kaydı başlatmak için{" "}
                <span className="inline-flex items-center mx-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-rose-500 rounded-full"></div>
                </span>{" "}
                simgesine basın ve aşağıdaki metni yüksek sesle okuyun, ardından{" "}
                <span className="inline-flex items-center mx-1">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
                </span>{" "}
                simgesine basarak kaydı dinleyin
              </p>

              {(
                <>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 text-center">
                    <p className="text-gray-500 text-xs sm:text-sm mb-2">Lütfen yüksek sesle okuyun:</p>
                    <p className="text-gray-700 font-medium text-lg sm:text-xl">
                      "Ben Türkçeyi seviyorum. Türkçem iyi ve her gün pratik yapıyorum!"
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                      <button
                        onClick={recording ? stopRecording : startRecording}
                        onTouchStart={(e) => {
                          // Prevent double-tap zoom on mobile
                          e.preventDefault();
                        }}
                        className={`w-14 h-14 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                          recording
                            ? "bg-gray-500 hover:bg-gray-600 active:bg-gray-700"
                            : "bg-rose-500 hover:bg-rose-600 active:bg-rose-700"
                        }`}
                        disabled={!!error}
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        {recording ? (
                          <Square className="w-7 h-7 sm:w-6 sm:h-6 text-white" />
                        ) : (
                          <div className="w-4 h-4 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                        )}
                      </button>

                      <div className="flex-1 w-full sm:w-auto">
                        <div className="w-full bg-rose-200 rounded-full h-2">
                          <div
                            className={`bg-rose-500 h-2 rounded-full ${
                              recording ? "animate-pulse" : ""
                            }`}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <span className="text-xs sm:text-sm text-rose-500 font-medium min-w-[30px]">
                          {recording ? "REC" : ""}
                        </span>

                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300 rounded"></div>
                          <select className="text-xs sm:text-sm text-gray-600 border-none bg-transparent">
                            <option>Varsayılan - Mikrofon</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {audioUrl && (
                    <div className="mt-4">
                      <audio controls src={audioUrl} className="w-full" />
                    </div>
                  )}

                  {audioUrl && (
                    <button
                      onClick={onSuccess}
                      className="mt-4 w-full sm:w-auto px-6 py-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm sm:text-base"
                    >
                      Sınava Başla
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm sm:text-base mb-3">{error}</p>
            
            {/* Mobile-specific help */}
            <div className="text-xs sm:text-sm text-gray-600 space-y-2">
              <p><strong>Mobil cihazlarda çözüm:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Tarayıcı ayarlarına gidin (⋮ menü)</li>
                <li>"Site ayarları" veya "İzinler" bölümünü bulun</li>
                <li>"Mikrofon" iznini "İzin ver" olarak değiştirin</li>
                <li>Sayfayı yenileyin (F5 veya ↻)</li>
              </ol>
              
              <div className="mt-3">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Sayfayı Yenile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
