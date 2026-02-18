import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Clock3,
  Headphones,
  MessageCircle,
  Pencil,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MicrophoneCheck } from "@/pages/speaking-test/components/MicrophoneCheck";
import { overallTestFlowStore, type TestType } from "@/services/overallTest.service";

type SectionGuide = {
  title: string;
  subtitle: string;
  duration: string;
  taskInfo: string;
  icon: ComponentType<{ className?: string }>;
  technicalWarnings: string[];
  needsSoundTest?: boolean;
  needsMicCheck?: boolean;
};

const COMMON_TECHNICAL_WARNINGS = [
  "Sayfayı yenilemeyin.",
  "Tarayıcıyı kapatmayın.",
];

const sectionGuides: Record<TestType, SectionGuide> = {
  LISTENING: {
    title: "Dinleme Bölümü",
    subtitle: "Ses kaydını dikkatle takip edin ve cevapları zamanında işaretleyin.",
    duration: "Yaklaşık 40-60 dakika",
    taskInfo: "Toplam 35 soru (6 bölüm)",
    icon: Headphones,
    needsSoundTest: true,
    technicalWarnings: [
      "Kulaklık kullanmanız önerilir.",
      "Başlamadan önce hoparlör/kulaklık sesini test edin.",
    ],
  },
  READING: {
    title: "Okuma Bölümü",
    subtitle: "Metinleri stratejik okuyup zamanı dengeli kullanın.",
    duration: "60 dakika",
    taskInfo: "Toplam 35 soru (5 bölüm)",
    icon: BookOpen,
    technicalWarnings: [
      "Zor soruya takılırsanız ilerleyip daha sonra geri dönün.",
      "Her parçaya dengeli süre ayırın.",
    ],
  },
  WRITING: {
    title: "Yazma Bölümü",
    subtitle: "Planlı yazın, paragraf düzenini koruyun ve süreyi yönetin.",
    duration: "60 dakika",
    taskInfo: "Toplam 3 görev",
    icon: Pencil,
    technicalWarnings: [
      "Görevi dikkatlice okuyup kısa plan yaptıktan sonra yazmaya başlayın.",
      "Son dakikalarda yazım ve dil bilgisi kontrolü yapın.",
    ],
  },
  SPEAKING: {
    title: "Konuşma Bölümü",
    subtitle: "Net konuşun, soruya odaklı kalın ve düzenli cevap verin.",
    duration: "Yaklaşık 10 dakika",
    taskInfo: "Toplam 3 bölüm",
    icon: MessageCircle,
    needsMicCheck: true,
    technicalWarnings: [
      "Mikrofon ve kamera izni açık olmalıdır.",
      "Mikrofon testini tamamlamadan bölümü başlatmayın.",
    ],
  },
};

const formatStep = (step: number, total: number) => {
  if (total <= 0) return "";
  return `${Math.min(step, total)} / ${total}`;
};

export default function OverallSectionReadyPage() {
  const navigate = useNavigate();
  const pending = overallTestFlowStore.getPendingNextSection();
  const nextType = pending?.next?.testType as TestType | undefined;
  const section = nextType ? sectionGuides[nextType] : null;

  const speakingMicStorageKey =
    pending?.next?.testType === "SPEAKING" && pending?.next?.testId
      ? `speaking_mic_checked_${pending.next.testId}`
      : null;

  const soundTestRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSoundTest, setIsPlayingSoundTest] = useState(false);
  const [isSpeakingMicReady, setIsSpeakingMicReady] = useState(false);

  const stepInfo = useMemo(() => {
    const total = Math.max(0, pending?.totalCount || 0);
    const completed = Math.max(0, pending?.completedCount || 0);
    const upcoming = total > 0 ? Math.min(total, completed + 1) : 0;
    return { total, completed, upcoming };
  }, [pending]);

  useEffect(() => {
    if (!speakingMicStorageKey) {
      setIsSpeakingMicReady(false);
      return;
    }

    setIsSpeakingMicReady(false);
    try {
      sessionStorage.removeItem(speakingMicStorageKey);
    } catch {}
  }, [speakingMicStorageKey]);

  useEffect(() => {
    return () => {
      if (soundTestRef.current) {
        soundTestRef.current.pause();
        soundTestRef.current = null;
      }
    };
  }, []);

  const handlePlaySoundTest = async () => {
    try {
      if (soundTestRef.current) {
        soundTestRef.current.pause();
      }

      const audio = new Audio("/start.wav");
      audio.volume = 0.8;
      audio.onended = () => setIsPlayingSoundTest(false);
      audio.onerror = () => {
        setIsPlayingSoundTest(false);
        toast.error("Ses testi oynatılamadı. Lütfen tekrar deneyin.");
      };
      soundTestRef.current = audio;

      setIsPlayingSoundTest(true);
      await audio.play();
    } catch {
      setIsPlayingSoundTest(false);
      toast.error("Tarayıcı sesi başlatamadı. Tekrar deneyin.");
    }
  };

  const handleSpeakingMicSuccess = () => {
    setIsSpeakingMicReady(true);
    if (speakingMicStorageKey) {
      try {
        sessionStorage.setItem(speakingMicStorageKey, "1");
      } catch {}
    }
  };

  const handleStart = async () => {
    const nextPath = pending?.next?.path;
    if (!nextPath) {
      navigate("/test", { replace: true });
      return;
    }

    if (section?.needsMicCheck && !isSpeakingMicReady) {
      toast.error("Önce mikrofon testini tamamlayın.");
      return;
    }

    try {
      document.body.classList.add("exam-mode");
      const doc: any = document as any;
      const el: any = document.documentElement as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      }
    } catch {}

    overallTestFlowStore.clearPendingNextSection();
    navigate(nextPath, { replace: true });
  };

  if (!pending || !section) {
    return (
      <div className="min-h-[calc(100vh-40px)] bg-gray-50 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8 text-center">
              <h1 className="text-xl font-bold text-gray-900">Sonraki bölüm bilgisi bulunamadı</h1>
              <p className="mt-2 text-sm text-gray-600">
                Test akışını tekrar başlatmak için testler sayfasına dönebilirsiniz.
              </p>
              <Button className="mt-6 bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate("/test")}>
                Testlere Dön
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const SectionIcon = section.icon;
  const allWarnings = [...COMMON_TECHNICAL_WARNINGS, ...section.technicalWarnings];

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain touch-pan-y bg-gray-50 px-3 sm:px-4 py-4 sm:py-8 pb-20 sm:pb-12">
      <div className="mx-auto max-w-4xl">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                  Bölüm Öncesi Uyarı
                </p>
                <h1 className="mt-3 text-2xl font-bold text-gray-900">{section.title}</h1>
                <p className="mt-2 text-sm text-gray-600">{section.subtitle}</p>
              </div>
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <SectionIcon className="h-6 w-6" />
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Sıra</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Bölüm {formatStep(stepInfo.upcoming, stepInfo.total)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Süre Bilgisi</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Clock3 className="h-4 w-4 text-gray-500" />
                  {section.duration}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Soru / Görev</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{section.taskInfo}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-gray-800">
                <ShieldAlert className="h-4 w-4" />
                <p className="text-sm font-semibold">Teknik Uyarılar</p>
              </div>
              <ul className="space-y-2">
                {allWarnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-2 text-sm text-gray-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>

              {section.needsSoundTest && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-100/70 p-3">
                  <p className="text-sm font-medium text-gray-800 mb-2">Kulaklık / Hoparlör Ses Testi</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePlaySoundTest}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    {isPlayingSoundTest ? "Ses Oynatılıyor..." : "Sesi Test Et"}
                  </Button>
                </div>
              )}
            </div>

            {section.needsMicCheck && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-900">
                  <MessageCircle className="h-4 w-4 text-gray-600" />
                  <p className="text-sm font-semibold">Mikrofon Testi</p>
                </div>
                {!isSpeakingMicReady ? (
                  <MicrophoneCheck
                    embedded
                    onSuccess={handleSpeakingMicSuccess}
                    successButtonLabel="Mikrofon Testini Tamamla"
                  />
                ) : (
                  <p className="text-sm text-emerald-700 font-medium">Mikrofon testi tamamlandı. Bölümü başlatabilirsiniz.</p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:mt-6 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  overallTestFlowStore.clearPendingNextSection();
                  navigate("/test");
                }}
              >
                Geri Dön
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-600"
                onClick={handleStart}
                disabled={section.needsMicCheck && !isSpeakingMicReady}
              >
                Hazırım, Bölümü Başlat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
