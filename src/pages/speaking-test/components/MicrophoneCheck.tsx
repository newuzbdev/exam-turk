import { Mic, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSuccess: () => void;
  embedded?: boolean;
  successButtonLabel?: string;
}

// 3. There was no cleanup of MediaRecorder or MediaStream after recording, which could cause issues on repeated recordings.

export const MicrophoneCheck = ({
  onSuccess,
  embedded = false,
  successButtonLabel = "Sınava Başla",
}: Props) => {
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
    <div
      className={
        embedded
          ? "bg-gray-50/60 rounded-xl p-4 sm:p-6 overflow-y-auto"
          : "h-[100dvh] bg-gray-50 p-4 sm:p-6 pb-28 sm:pb-20 safe-area-bottom safe-area-top overflow-y-auto overscroll-contain touch-pan-y"
      }
    >
      <div className={embedded ? "max-w-none" : "max-w-5xl mx-auto"}>
        {!embedded && (
          <div className="flex justify-center mb-6 sm:mb-12">
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-9 sm:h-11 md:h-12 w-auto object-contain"
              onError={(e) => {
                console.error("Logo failed to load");
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className={embedded ? "space-y-4" : "space-y-5 sm:space-y-8"}>

          <div className={embedded ? "flex flex-col gap-3" : "flex flex-col sm:flex-row gap-4 sm:gap-6"}>
            <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-start">
              <div className={`${embedded ? "w-10 h-10" : "w-11 h-11 sm:w-16 sm:h-16"} rounded-full border-2 border-gray-300 flex items-center justify-center`}>
                <Mic className={`${embedded ? "w-4 h-4" : "w-5 h-5 sm:w-8 sm:h-8"} text-gray-600`} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className={`${embedded ? "text-sm" : "text-base sm:text-xl"} font-semibold mb-2 text-slate-700`}>
                Mikrofon kontrolü
              </h2>
              <p className={`${embedded ? "mb-3 text-xs sm:text-sm" : "mb-4 text-sm sm:text-base"} text-gray-600`}>
                {embedded
                  ? "Kısa bir kayıt alıp dinleyin. Ses netse devam edin."
                  : (
                    <>
                      Sınava başlamadan önce mikrofonunuzun düzgün çalıştığından emin olun. Kaydı başlatmak için{" "}
                      <span className="inline-flex items-center mx-1">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-rose-500 rounded-full" />
                      </span>{" "}
                      simgesine basın ve aşağıdaki metni yüksek sesle okuyun, ardından{" "}
                      <span className="inline-flex items-center mx-1">
                        <Play className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
                      </span>{" "}
                      simgesine basarak kaydı dinleyin
                    </>
                  )}
              </p>

              {(
                <>
                  <div className={`bg-gray-50 rounded-lg ${embedded ? "p-2.5" : "p-3 sm:p-4"} mb-3 text-center`}>
                    <p className="text-gray-500 text-xs mb-1.5">Lütfen yüksek sesle okuyun:</p>
                    <p className={`${embedded ? "text-sm sm:text-base" : "text-base sm:text-xl"} text-gray-700 font-medium`}>
                      {"\"Bir berber bir berbere, gel beraber bir berber d\u00fckk\u00e2n\u0131 a\u00e7al\u0131m demi\u015f.\""}
                    </p>
                  </div>

                  <div className={`bg-white rounded-lg border border-gray-200 ${embedded ? "p-2.5" : "p-3 sm:p-4"}`}>
                    <div className={`${embedded ? "flex items-center gap-3" : "flex flex-col sm:flex-row items-center gap-3 sm:gap-4"}`}>
                      <button
                        onClick={recording ? stopRecording : startRecording}
                        onTouchStart={(e) => {
                          // Prevent double-tap zoom on mobile
                          e.preventDefault();
                        }}
                        className={`speaking-mic-check-core ${embedded ? "w-12 h-12" : "w-14 h-14 sm:w-14 sm:h-14"} rounded-full flex items-center justify-center transition-all duration-300 touch-manipulation shadow-lg hover:shadow-xl ${
                          recording
                            ? "bg-gray-600 hover:bg-gray-700 active:bg-gray-800 ring-2 ring-gray-400"
                            : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 ring-2 ring-rose-300"
                        }`}
                        disabled={!!error}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        {recording ? (
                          <Square className={`${embedded ? "w-5 h-5" : "w-6 h-6 sm:w-6 sm:h-6"} text-white`} />
                        ) : (
                          <div className="w-3 h-3 sm:w-3 sm:h-3 bg-white rounded-full"></div>
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

                      <div className={`${embedded ? "w-auto" : "flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start"}`}>
                        <span className={`${embedded ? "text-xs min-w-0" : "text-xs sm:text-sm min-w-[30px]"} text-rose-500 font-medium`}>
                          {recording ? "REC" : ""}
                        </span>

                        {!embedded && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300 rounded"></div>
                            <select className="text-xs sm:text-sm text-gray-600 border-none bg-transparent">
                              <option>Varsayılan - Mikrofon</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {audioUrl && (
                    <div className={embedded ? "mt-2" : "mt-4"}>
                      <audio controls src={audioUrl} className="w-full" />
                    </div>
                  )}

                  {audioUrl && (
                    <button
                      onClick={onSuccess}
                      className={`${embedded ? "mt-3 py-2.5 text-sm" : "mt-6 py-4 text-base sm:text-lg"} w-full sm:w-auto px-6 sm:px-8 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-all duration-300 cursor-pointer font-semibold shadow-lg hover:shadow-xl ring-2 ring-red-300 hover:ring-red-400`}
                    >
                      {successButtonLabel}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className={`${embedded ? "mt-3 p-3" : "mt-4 sm:mt-6 p-3 sm:p-4"} bg-red-50 border border-red-200 rounded-lg`}>
            <p className={`${embedded ? "text-xs sm:text-sm mb-2" : "text-sm sm:text-base mb-3"} text-red-600`}>{error}</p>
            {embedded ? (
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-md text-xs sm:text-sm font-semibold"
              >
                Sayfayı Yenile
              </button>
            ) : (
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
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 ring-2 ring-blue-300"
                  >
                    Sayfayı Yenile
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
