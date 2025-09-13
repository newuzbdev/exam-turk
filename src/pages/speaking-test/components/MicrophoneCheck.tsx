import { Clock, Mic, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSuccess: () => void;
}

// 3. There was no cleanup of MediaRecorder or MediaStream after recording, which could cause issues on repeated recordings.

export const MicrophoneCheck = ({ onSuccess }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // We'll store the current MediaRecorder and MediaStream for cleanup
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check for MediaRecorder support
  const isMediaRecorderSupported =
    typeof window !== "undefined" && "MediaRecorder" in window;

  // Request mic permission on mount, but do not create MediaRecorder yet.
  useEffect(() => {
    // Only check permission, don't keep stream alive
    const checkMic = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setError(null);
      } catch {
        setError("Mikrofon izni verilmedi veya mikrofon bulunamadı.");
      }
    };
    if (isMediaRecorderSupported) {
      checkMic();
    } else {
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
    if (!isMediaRecorderSupported) {
      setError("Tarayıcınız mikrofonla kayıt almayı desteklemiyor.");
      return;
    }
    try {
      // Always request a new stream for each recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        setAudioUrl(URL.createObjectURL(blob));
        // Stop all tracks after recording
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        	streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        setError("Kayıt sırasında bir hata oluştu.");
        setRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError("Mikrofon izni verilmedi veya mikrofon bulunamadı.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setRecording(false);
    }
  };


  const proceedToWaitingRoom = () => {
    setCurrentStep(3);
    // Auto proceed to test after waiting
    setTimeout(() => {
      onSuccess();
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-center mb-12 text-red-700 text-4xl font-medium gap-2">{"Türkçe Test"}</h1>

        <div className="space-y-8">

          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div
                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${
                  currentStep >= 1 ? "border-rose-300" : "border-gray-200"
                }`}
              >
                <Mic className={`w-8 h-8 ${currentStep >= 1 ? "text-rose-500" : "text-gray-300"}`} />
              </div>
              <div className="w-px h-32 bg-gray-200 mx-8 mt-4"></div>
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-semibold mb-3 ${currentStep >= 1 ? "text-slate-700" : "text-gray-400"}`}>
                1. Mikrofon kontrolü
              </h2>
              <p
                className={`mb-4 ${
                  currentStep >= 2 ? "text-gray-600" : "text-gray-400"
                }`}
              >
                Sınava başlamadan önce mikrofonunuzun düzgün çalıştığından emin olun. Kaydı başlatmak için{" "}
                <span className="inline-flex items-center mx-1">
                  <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                </span>{" "}
                simgesine basın ve aşağıdaki metni yüksek sesle okuyun, ardından{" "}
                <span className="inline-flex items-center mx-1">
                  <Play className="w-4 h-4 text-rose-500" />
                </span>{" "}
                simgesine basarak kaydı dinleyin
              </p>

              {currentStep >= 1 && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                    <p className="text-gray-500 text-sm mb-2">Lütfen yüksek sesle okuyun:</p>
                    <p className="text-gray-700 font-medium text-xl">
                      "Ben Türkçeyi seviyorum. Türkçem iyi ve her gün pratik yapıyorum!"
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={recording ? stopRecording : startRecording}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          recording
                            ? "bg-gray-500 hover:bg-gray-600"
                            : "bg-rose-500 hover:bg-rose-600"
                        }`}
                        disabled={!!error}
                      >
                        {recording ? (
                          <Square className="w-6 h-6 text-white" />
                        ) : (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="w-full bg-rose-200 rounded-full h-2">
                          <div
                            className={`bg-rose-500 h-2 rounded-full ${
                              recording ? "animate-pulse" : ""
                            }`}
                          ></div>
                        </div>
                      </div>

                      <span className="text-sm text-rose-500 font-medium min-w-[30px]">
                        {recording ? "REC" : ""}
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        <select className="text-sm text-gray-600 border-none bg-transparent">
                          <option>Varsayılan - Mikrofon</option>
                        </select>
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
                      onClick={proceedToWaitingRoom}
                      className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer font-medium"
                    >
                      Bekleme odasına geç
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div
                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${
                  currentStep >= 3 ? "border-rose-300" : "border-gray-200"
                }`}
              >
                <Clock
                  className={`w-8 h-8 ${
                    currentStep >= 3
                      ? "text-rose-500 animate-spin"
                      : "text-gray-300"
                  }`}
                />
              </div>
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-semibold mb-3 ${currentStep >= 3 ? "text-slate-700" : "text-gray-400"}`}>
                2. Bekleme odası
              </h2>
              <p
                className={`${
                  currentStep >= 3 ? "text-gray-600" : "text-gray-400"
                }`}
              >
                Şu anda bekleme odasındasınız. Sınav görevlisi kısa süre içinde görüşmeye katılacak. Lütfen biraz bekleyin.
              </p>

              {currentStep === 3 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <span className="text-sm text-gray-500 ml-2">
                    Sınav görevlisine bağlanılıyor...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
