import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { MicrophoneCheck } from "@/pages/speaking-test/components/MicrophoneCheck";
import { speakingMicrophoneStorageKey } from "@/services/speakingRecordingLifecycle";
import {
  getOverallSectionTimerErrorMessage,
  overallTestFlowStore,
  overallTestService,
  overallTestTokenStore,
  type TestType,
} from "@/services/overallTest.service";
import { useOverallSectionHeartbeat } from "@/hooks/use-overall-section-heartbeat";
import {
  listeningPreparationStore,
  prepareListeningAudioPlayback,
} from "@/services/listeningPreparation.store";
import WritingCharacterPractice from "./components/WritingCharacterPractice";
import { getWritingPresentationInputMode, useWritingInputMode } from "@/components/writing-test/use-writing-input-mode";
import { useMobilePresentation } from "@/hooks/use-mobile-presentation";
import ListeningSoundCheck from "./components/ListeningSoundCheck";
import {
  activateExamPresentation,
  clearExamPresentation,
  getExamFullscreenElement,
  requestExamFullscreen,
} from "@/utils/examFullscreen";
import { getSharedExamAudioController } from "@/utils/examAudio";
import { formatListeningPreparationDuration, TEST_SECTION_DURATION } from "./test-section-info";
import "./OverallSectionReadyPage.css";

type SectionGuide = {
  title: string;
  duration: string;
  taskInfo: string;
  checklist: string[];
  questionDistribution?: readonly {
    label: string;
    summary: string;
    detail?: string;
  }[];
  needsSoundTest?: boolean;
  needsMicCheck?: boolean;
};

const sectionGuides: Record<TestType, SectionGuide> = {
  LISTENING: {
    title: "Dinleme",
    duration: TEST_SECTION_DURATION.LISTENING,
    taskInfo: "6 dinleme metni · 35 soru",
    questionDistribution: [8, 6, 4, 5, 6, 6].map((count, index) => ({
      label: `${index + 1}. bölüm`,
      summary: `${count} soru`,
    })),
    needsSoundTest: true,
    checklist: [
      "Kayıttaki yönergeleri takip edip cevaplarınızı işaretleyin.",
      "Kayıt bitince cevaplarınızı kontrol etmek için 10 dakikanız var.",
      "Süre durdurulamaz.",
    ],
  },
  READING: {
    title: "Okuma",
    duration: TEST_SECTION_DURATION.READING,
    taskInfo: "5 okuma metni · 35 soru",
    questionDistribution: [6, 8, 6, 9, 6].map((count, index) => ({
      label: `${index + 1}. bölüm`,
      summary: `${count} soru`,
    })),
    checklist: [
      "Metinleri okuyup cevaplarınızı işaretleyin.",
      "Bu bölümde cevaplarınızı değiştirebilirsiniz.",
      "Süre durdurulamaz.",
    ],
  },
  WRITING: {
    title: "Yazma",
    duration: TEST_SECTION_DURATION.WRITING,
    taskInfo: "3 görev",
    questionDistribution: [
      { label: "Görev 1.1", summary: "50 kelime", detail: "Samimi e-posta" },
      { label: "Görev 1.2", summary: "120–150 kelime", detail: "Resmî e-posta" },
      { label: "Görev 2", summary: "180–200 kelime", detail: "Blog / forum / dergi" },
    ],
    checklist: [
      "Süre üç görev için ortaktır ve durdurulamaz.",
    ],
  },
  SPEAKING: {
    title: "Konuşma",
    duration: TEST_SECTION_DURATION.SPEAKING,
    taskInfo: "4 bölüm",
    questionDistribution: [
      { label: "Bölüm 1.1", summary: "3 soru", detail: "Kişisel sorular" },
      { label: "Bölüm 1.2", summary: "3 soru", detail: "İki görsel" },
      { label: "Bölüm 2", summary: "3 soru", detail: "Tek yanıt" },
      { label: "Bölüm 3", summary: "1 konu", detail: "Lehte / aleyhte" },
    ],
    needsMicCheck: true,
    checklist: [
      "Hazırlık ve konuşma sürelerini sınav ekranından takip edin. Kayıt otomatik başlar; süre durdurulamaz.",
    ],
  },
};

type ListeningPreparationState = "idle" | "loading" | "ready" | "error";
type PreparationPresentationState = "checking" | "ready" | "blocked";

export default function OverallSectionReadyPage() {
  const navigate = useNavigate();
  const mobile = useMobilePresentation();
  const pending = overallTestFlowStore.getPendingNextSection();
  useOverallSectionHeartbeat(pending?.next?.testId);
  const nextType = pending?.next?.testType as TestType | undefined;
  const section = nextType ? sectionGuides[nextType] : null;
  const writingTestId = nextType === "WRITING" ? pending?.next?.testId ?? null : null;
  const [writingInputMode, setWritingInputMode] = useWritingInputMode(
    writingTestId,
    writingTestId ? overallTestTokenStore.getByTestId(writingTestId) : null,
  );
  const presentationInputMode = getWritingPresentationInputMode(writingInputMode, mobile);

  const speakingMicStorageKey =
    pending?.next?.testType === "SPEAKING" && pending?.next?.testId
      ? `speaking_mic_checked_${pending.next.testId}`
      : null;

  const isStartingSectionRef = useRef(false);
  const [isListeningSoundReady, setIsListeningSoundReady] = useState(false);
  const [isSpeakingMicReady, setIsSpeakingMicReady] = useState(false);
  const [isStartingSection, setIsStartingSection] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [listeningPreparationState, setListeningPreparationState] =
    useState<ListeningPreparationState>("idle");
  const [listeningPreparationError, setListeningPreparationError] =
    useState<string | null>(null);
  const [listeningPreparationAttempt, setListeningPreparationAttempt] =
    useState(0);
  const [listeningDuration, setListeningDuration] =
    useState<string>(TEST_SECTION_DURATION.LISTENING);
  const [presentationState, setPresentationState] =
    useState<PreparationPresentationState>("checking");
  const isPresentationReady = presentationState === "ready";

  const stepInfo = useMemo(() => {
    const total = Math.max(0, pending?.totalCount || 0);
    const completed = Math.max(0, pending?.completedCount || 0);
    const upcoming = total > 0 ? Math.min(total, completed + 1) : 0;
    return { total, completed, upcoming };
  }, [pending]);
  const isPreparationOnly = stepInfo.completed === 0;

  useEffect(() => {
    if (!speakingMicStorageKey) {
      setIsSpeakingMicReady(false);
      return;
    }

    try {
      setIsSpeakingMicReady(
        sessionStorage.getItem(speakingMicStorageKey) === "1",
      );
    } catch {
      setIsSpeakingMicReady(false);
    }
  }, [speakingMicStorageKey]);

  useLayoutEffect(() => {
    let mounted = true;
    void clearExamPresentation().then((cleared) => {
      if (!mounted) return;
      setPresentationState(
        cleared && !getExamFullscreenElement() ? "ready" : "blocked",
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const keepPreparationWindowed = () => {
      if (isStartingSectionRef.current) return;
      if (getExamFullscreenElement()) {
        setPresentationState("checking");
      }
      void clearExamPresentation().then((cleared) => {
        if (isStartingSectionRef.current) return;
        setPresentationState(
          cleared && !getExamFullscreenElement() ? "ready" : "blocked",
        );
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        keepPreparationWindowed();
      }
    };

    // Safari returns focus/pageshow after its microphone permission sheet.
    // A preparation page must never inherit fullscreen from a previous route.
    window.addEventListener("pageshow", keepPreparationWindowed);
    window.addEventListener("focus", keepPreparationWindowed);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", keepPreparationWindowed);
      window.removeEventListener("focus", keepPreparationWindowed);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const testId =
      nextType === "LISTENING" ? String(pending?.next?.testId || "") : "";
    setListeningDuration(TEST_SECTION_DURATION.LISTENING);
    if (!testId) {
      setListeningPreparationState("idle");
      setListeningPreparationError(null);
      return;
    }

    const sessionToken = overallTestTokenStore.getByTestId(testId);
    if (!sessionToken) {
      setListeningPreparationState("error");
      setListeningPreparationError(
        "Dinleme oturumu hazırlanamadı. Testler sayfasından tekrar deneyin.",
      );
      return;
    }

    const cachedPreparation = listeningPreparationStore.get(
      testId,
      sessionToken,
    );
    if (cachedPreparation?.playback) {
      setListeningDuration(formatListeningPreparationDuration(cachedPreparation.preparedSection));
      setListeningPreparationState("ready");
      setListeningPreparationError(null);
      return () => {
        if (!isStartingSectionRef.current) listeningPreparationStore.clear(testId);
      };
    }

    let mounted = true;
    setListeningPreparationState("loading");
    setListeningPreparationError(null);

    Promise.all([
      overallTestService.prepareSectionForTest(testId),
      overallTestService.preloadListeningAudioForTest(testId),
    ])
      .then(async ([preparedSection, audioBlob]) => {
        if (!preparedSection || !audioBlob) {
          throw new Error("Dinleme sesi hazırlanamadı.");
        }

        if (!mounted) return;
        const playback = await prepareListeningAudioPlayback(audioBlob);
        if (!mounted) { playback.dispose(); return; }

        listeningPreparationStore.set(
          testId,
          sessionToken,
          preparedSection,
          audioBlob,
          playback,
        );
        setListeningDuration(formatListeningPreparationDuration(preparedSection));
        setListeningPreparationState("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        listeningPreparationStore.clear(testId);
        setListeningPreparationState("error");
        setListeningPreparationError(
          getOverallSectionTimerErrorMessage(error),
        );
      });

    return () => {
      mounted = false;
      if (!isStartingSectionRef.current) listeningPreparationStore.clear(testId);
    };
  }, [
    listeningPreparationAttempt,
    nextType,
    pending?.next?.testId,
  ]);

  const handleSpeakingMicSuccess = (deviceId: string) => {
    // Keep the speaking narration context unlocked before entering fullscreen.
    // Safari only permits this while handling a direct user interaction.
    void getSharedExamAudioController()
      .unlockFromUserGesture()
      .catch(() => undefined);
    setIsSpeakingMicReady(true);
    if (speakingMicStorageKey) {
      try {
        sessionStorage.setItem(speakingMicStorageKey, "1");
        if (pending?.next?.testId) sessionStorage.setItem(speakingMicrophoneStorageKey(pending.next.testId), deviceId);
      } catch {}
    }
  };

  const handleSpeakingMicRetry = () => {
    if (isStartingSection || isExiting) return;
    setIsSpeakingMicReady(false);
    try {
      if (speakingMicStorageKey) sessionStorage.removeItem(speakingMicStorageKey);
      if (pending?.next?.testId) {
        sessionStorage.removeItem(speakingMicrophoneStorageKey(pending.next.testId));
      }
    } catch {}
  };

  const handleExitPreparationFullscreen = async () => {
    setPresentationState("checking");
    const cleared = await clearExamPresentation();
    setPresentationState(
      cleared && !getExamFullscreenElement() ? "ready" : "blocked",
    );
  };

  const handleStart = async () => {
    if (isStartingSectionRef.current) return;
    const nextPath = pending?.next?.path;
    if (!nextPath) {
      navigate("/app/test", { replace: true });
      return;
    }

    if (section?.needsMicCheck && !isSpeakingMicReady) {
      toast.error("Önce mikrofon testini tamamlayın.");
      return;
    }

    if (section?.needsSoundTest && !isListeningSoundReady) {
      toast.error("Önce deneme sesini dinleyip duyduğunuzu onaylayın.");
      return;
    }

    if (nextType === "WRITING" && !presentationInputMode) {
      toast.error("Önce yazma yönteminizi seçin.");
      return;
    }

    const speakingAudioUnlock =
      nextType === "SPEAKING"
        ? getSharedExamAudioController().unlockFromUserGesture().catch(() => false)
        : null;

    const nextTestId = String(pending?.next?.testId || "");
    const listeningToken = nextType === "LISTENING"
      ? overallTestTokenStore.getByTestId(nextTestId) : null;
    const listeningPrepared = listeningToken
      ? listeningPreparationStore.get(nextTestId, listeningToken) : null;
    if (nextType === "LISTENING" &&
      (listeningPreparationState !== "ready" || !listeningPrepared?.playback)) {
      toast.error(listeningPreparationError || "Dinleme sesi henüz hazır değil. Lütfen bekleyin.");
      return;
    }

    // Retain this exact media element's user-gesture permission across navigation.
    const listeningAudioUnlock = listeningPrepared?.playback
      ?.unlockFromUserGesture().then(() => true, () => false);
    isStartingSectionRef.current = true;
    setIsStartingSection(true);

    const enteredFullscreen = await requestExamFullscreen();
    if (!enteredFullscreen) {
      await listeningAudioUnlock;
      await clearExamPresentation();
      toast.error("Tam ekran açılamadı. Tarayıcı iznini kontrol edip tekrar deneyin.");
      isStartingSectionRef.current = false;
      setIsStartingSection(false);
      return;
    }

    const [speakingAudioReady, listeningAudioReady] = await Promise.all([
      speakingAudioUnlock, listeningAudioUnlock,
    ]);
    if ((nextType === "SPEAKING" && !speakingAudioReady) ||
      (nextType === "LISTENING" && !listeningAudioReady)) {
      await clearExamPresentation();
      toast.error("Ses başlatılamadı. Sınava başla düğmesine tekrar basın.");
      isStartingSectionRef.current = false;
      setIsStartingSection(false);
      return;
    }

    try {
      if (nextType === "LISTENING") {
        if (!listeningToken || !listeningPreparationStore.markStartRequested(nextTestId, listeningToken)) {
          throw new Error("Dinleme sesi yeniden hazırlanmalı.");
        }
        // The existing timer endpoint runs when playback starts after the 3s
        // countdown. Neither audio time nor the 10-minute review is spent here.
      } else {
        await overallTestService.startSectionTimerForTest(nextTestId);
      }
      if (nextType === "SPEAKING") {
        try {
          sessionStorage.setItem(`speaking_exam_started_${nextTestId}`, "1");
        } catch {}
      }
      activateExamPresentation();
    } catch (error) {
      await clearExamPresentation();
      toast.error(getOverallSectionTimerErrorMessage(error));
      isStartingSectionRef.current = false;
      setIsStartingSection(false);
      return;
    }

    overallTestFlowStore.clearPendingNextSection();
    navigate(nextPath, { replace: true });
  };

  const handleExitRequested = () => {
    setShowExitConfirmModal(true);
  };

  const handleConfirmExit = async () => {
    const overallId = overallTestFlowStore.getOverallId();
    if (!overallId) {
      await clearExamPresentation();
      overallTestFlowStore.clearPendingNextSection();
      overallTestFlowStore.clear();
      navigate("/app/test", { replace: true });
      return;
    }

    setIsExiting(true);
    const done = await overallTestService.finalizeEarlyExit(overallId);
    if (!done) {
      setIsExiting(false);
      return;
    }

    overallTestFlowStore.clearPendingNextSection();
    overallTestFlowStore.clear();
    await clearExamPresentation();
    setIsExiting(false);
    setShowExitConfirmModal(false);
    navigate(
      stepInfo.completed > 0 ? `/overall-results/${overallId}` : "/app/test",
      { replace: true },
    );
  };

  if (!pending || !section) {
    return (
      <div className="section-ready-page">
        <section className="section-ready-surface section-ready-notice">
          <h1>Başlatılacak bölüm yok</h1>
          <p>Testler sayfasından bir sınav ve çalışmak istediğiniz bölümü seçin.</p>
          <Button className="section-ready-start" onClick={() => navigate("/app/test")}>
            Testlere dön
          </Button>
        </section>
      </div>
    );
  }

  if (presentationState === "checking") {
    return (
      <div className="section-ready-page" aria-busy="true">
        <p className="section-ready-loading" role="status">Hazırlık ekranı açılıyor…</p>
      </div>
    );
  }

  if (presentationState === "blocked") {
    return (
      <div className="section-ready-page">
        <section className="section-ready-surface section-ready-notice">
          <h1>
            Hazırlık için tam ekrandan çıkın
          </h1>
          <p>
            Hazırlık kontrollerini tamamlamak için pencere görünümüne geçin.
          </p>
          <Button
            type="button"
            onClick={handleExitPreparationFullscreen}
            className="section-ready-start"
          >
            Tam ekrandan çık
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div data-section-ready-page data-skill={nextType?.toLowerCase()} data-layout="compact" className="section-ready-page">
      <section className="section-ready-surface" aria-labelledby="section-ready-title">
        <header className="section-ready-header">
          <div className="section-ready-heading">
            <div className="min-w-0">
              <img src="/logo11.svg" alt="TURKISHMOCK" className="mock-ready-logo hidden" />
              <h1 id="section-ready-title">{section.title}</h1>
              <dl className="section-ready-meta">
                <div>
                  <dt className="sr-only">Bölüm ve görev bilgisi</dt>
                  <dd>{section.taskInfo}</dd>
                </div>
                <div>
                  <dt className="sr-only">Süre</dt>
                  <dd>{nextType === "LISTENING" ? listeningDuration : section.duration}</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <div className="section-ready-body">
          {nextType === "READING" || nextType === "LISTENING" ? (
            <ul className="section-ready-rules" aria-label={`${section.title} yönergeleri`}>
              {section.checklist.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
          ) : (
            <p className="section-ready-intro">
              {section.checklist.join(" ")}
            </p>
          )}
          {section.questionDistribution && (
            <dl
              className="section-ready-distribution"
              data-count={section.questionDistribution.length}
              aria-label="Bölümlere göre soru ve görev dağılımı"
            >
              {section.questionDistribution.map((part) => (
                <div key={part.label}>
                  <dt>{part.label}</dt>
                  <dd>
                    {part.summary}
                    {part.detail && <span className="section-ready-distribution-detail">{part.detail}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {nextType === "WRITING" && !mobile && (
            <section className="section-ready-control section-ready-writing" aria-label="Klavye kontrolü">
              <WritingCharacterPractice
                key={writingTestId}
                inputMode={writingInputMode}
                onInputModeChange={setWritingInputMode}
                disabled={isStartingSection || isExiting}
              />
            </section>
          )}

          {section.needsSoundTest && (
            <section className="section-ready-control section-ready-sound" aria-labelledby="section-ready-sound-title">
              <ListeningSoundCheck
                key={pending?.next?.testId}
                onReadyChange={setIsListeningSoundReady}
                disabled={isStartingSection || isExiting}
              />
              <div
                className="section-ready-audio-status"
                role="status"
                aria-live="polite"
              >
                {listeningPreparationState === "loading" ? (
                  <div className="section-ready-status">
                    <span className="section-ready-loading-dot" aria-hidden="true" />
                    <span>Sınav sesi hazırlanıyor…</span>
                  </div>
                ) : listeningPreparationState === "error" ? (
                  <div>
                    <p className="section-ready-error">
                      {listeningPreparationError ||
                        "Ses hazırlanamadı. Tekrar deneyin."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setListeningPreparationAttempt(
                          (attempt) => attempt + 1,
                        )
                      }
                      className="section-ready-secondary mt-3"
                    >
                      Tekrar dene
                    </Button>
                  </div>
                ) : listeningPreparationState === "ready" ? (
                  <div className="section-ready-status"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /><span>Sınav sesi hazır · Başlatınca 3 saniye sonra çalacak.</span></div>
                ) : null}
              </div>
            </section>
          )}

          {section.needsMicCheck && (
            <section className="section-ready-control section-ready-microphone" aria-labelledby="section-ready-mic-title">
              {isSpeakingMicReady ? (
                <div className="section-ready-mic-ready-row">
                  <h2 id="section-ready-mic-title" className="section-ready-mic-ready" role="status">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    Mikrofon hazır
                  </h2>
                  <button
                    type="button"
                    className="section-ready-mic-retry"
                    onClick={handleSpeakingMicRetry}
                    disabled={isStartingSection || isExiting}
                  >
                    Tekrar dene
                  </button>
                </div>
              ) : (
                <>
                  <div className="section-ready-control-heading">
                    <div>
                      <h2 id="section-ready-mic-title">Mikrofonunuzu kontrol edin</h2>
                    </div>
                  </div>
                  <MicrophoneCheck
                    embedded
                    onSuccess={handleSpeakingMicSuccess}
                    successButtonLabel="Sesi onaylayın"
                  />
                </>
              )}
            </section>
          )}
        </div>

        <footer className="section-ready-footer">
          <Button
            variant="outline"
            className="section-ready-secondary"
            onClick={handleExitRequested}
          >
            {isPreparationOnly ? "Geri dön" : "Sınavdan çık"}
          </Button>
          <Button
            className="section-ready-start"
            onClick={handleStart}
            disabled={
              !isPresentationReady ||
              isStartingSection ||
              (nextType === "WRITING" && !presentationInputMode) ||
              (section.needsMicCheck && !isSpeakingMicReady) ||
              (section.needsSoundTest && !isListeningSoundReady) ||
              (nextType === "LISTENING" &&
                listeningPreparationState !== "ready")
            }
          >
            {isStartingSection
              ? "Başlatılıyor…"
              : nextType === "LISTENING" &&
                  listeningPreparationState === "loading"
                ? "Ses hazırlanıyor…"
                : "Sınava başla"}
          </Button>
        </footer>
      </section>

      <ConfirmationModal
        isOpen={showExitConfirmModal}
        onClose={() => !isExiting && setShowExitConfirmModal(false)}
        onConfirm={handleConfirmExit}
        title={isPreparationOnly ? "Hazırlık iptal edilsin mi?" : "Sınavdan çıkılsın mı?"}
        message={isPreparationOnly
          ? "Seçtiğiniz bölümler iptal edilecek. Henüz sınava başlamadığınız için katılım, sonuç veya ücret oluşmayacak."
          : "Bu deneme burada bitecek. Tamamladığınız bölümler değerlendirilecek. Tekrar çözmek isterseniz baştan başlayacaksınız."}
        confirmText={isPreparationOnly ? "Evet, iptal et" : "Evet, çık"}
        cancelText="İptal"
        isLoading={isExiting}
      />
    </div>
  );
}
