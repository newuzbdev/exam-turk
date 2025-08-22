import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

interface Props {
  onSuccess: () => void;
}

export const MicrophoneCheck = ({ onSuccess }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [ready, setReady] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setVolume(avg);
          setReady(avg > 5);
          animationRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      } catch (err) {
        console.error("Microphone error:", err);
        setError("Mikrofon ruxsati berilmadi yoki topilmadi.");
      }
    };

    initMic();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
          Mikrofoningizni yoqing va gapirib ko‘ring. Ovoz aniqlansa, quyidagi
          indikator harakatlanadi.
        </p>

        <div className="w-full bg-gray-200 rounded-full h-4 mb-6 overflow-hidden">
          <div
            className="h-4 bg-green-500 transition-all duration-100"
            style={{ width: `${Math.min(volume * 2, 100)}%` }}
          />
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <button
          disabled={!ready}
          onClick={onSuccess}
          className={`w-full py-3 rounded-lg font-bold text-white text-lg ${
            ready
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Testni Boshlash
        </button>
      </div>
    </div>
  );
};
