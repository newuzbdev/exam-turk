import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

interface Props {
  onSuccess: () => void;
}

export const MicrophoneCheck = ({ onSuccess }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Mikrofonni sozlash
  const initMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      };
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Mikrofon ruxsati berilmadi yoki topilmadi.");
    }
  };

  useEffect(() => {
    initMic();
  }, []);

  const startRecording = () => {
    if (!recorderRef.current) return;
    chunksRef.current = [];
    recorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mic className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-black mb-4">
          Mikrofon Tekshiruvi
        </h1>
        <p className="text-gray-700 mb-6">
          Mikrofoningizni yoqing, gapirib yozib oling va qayta eshitib ko‘ring.
        </p>

        {/* Tugmalar */}
        {!recording && !audioUrl && (
          <button
            onClick={startRecording}
            className="w-full py-3 rounded-lg font-bold text-white text-lg bg-red-600 hover:bg-red-700 mb-4"
          >
            Yozishni Boshlash
          </button>
        )}

        {recording && (
          <button
            onClick={stopRecording}
            className="w-full py-3 rounded-lg font-bold text-white text-lg bg-gray-600 hover:bg-gray-700 mb-4"
          >
            Yozishni To‘xtatish
          </button>
        )}

        {/* Audio qayta eshitish */}
        {audioUrl && (
          <div className="mb-6">
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* Testni boshlash faqat ovoz yozilib eshitilgandan keyin */}
        <button
          disabled={!audioUrl}
          onClick={onSuccess}
          className={`w-full py-3 rounded-lg font-bold text-white text-lg ${
            audioUrl
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Testni Boshlash
        </button>
      </div>
    </div>
  );
};
