import { publishCurrentActivity } from '@/utils/access-link-context';
import { hasUnfinishedWritingPractice, readWritingPracticeAccess, saveWritingPracticeAccess, saveWritingPracticePaidContinuation } from './writing-practice-storage';
import { reconcileWritingPracticeRun, type WritingPracticeRun } from './writing-practice-run';
import ContentAccessRecovery from '@/components/subscription/ContentAccessRecovery';
import { notifyAccessAllowanceChanged } from '@/utils/access-events';
import { readAccessOwner, useOwnedAccessContext } from '@/hooks/use-access-link';
import { useQueryClient } from "@tanstack/react-query";
import PracticeAllowance from "@/components/practice/PracticeAllowance";
import { subscriptionStatusQueryKey } from "@/services/subscription.service";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Keyboard,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { WRITING_PRACTICE_HELP_ENABLED } from "@/config/practiceFeatures";
import PracticeDurationControl from "@/components/practice/PracticeDurationControl";
import WritingPracticeCorrections from "./WritingPracticeCorrections";
import WritingPracticeHelp from "./WritingPracticeHelp";
import ReadingSplitHandle from "@/components/reading-test/ui/ReadingSplitHandle";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WritingRichText from "@/components/writing-test/WritingRichText";
import { getWritingTypographyPreset } from "@/components/writing-test/writing-typography";
import { TURKISH_CHARACTER_SHORTCUTS } from "@/components/writing-test/writing-turkish-input";
import { useWritingTurkishLongPressInput } from "@/components/writing-test/use-writing-turkish-long-press";
import {
  useWritingInputMode,
  type WritingInputMode,
} from "@/components/writing-test/use-writing-input-mode";
import {
  countWritingWords,
  getWritingAnswerLimits,
  getWritingPracticeTasks,
  getWritingStudentTaskMetadata,
  getWritingTaskSectionLabel,
  getWritingWordTargetLabel,
  limitWritingAnswer,
} from "./writing-practice-utils";
import {
  getPracticeErrorMessage,
  WRITING_PRACTICE_FEEDBACK_VERSION,
  type PracticeSolve,
  type WritingPracticeContent,
  type WritingPracticeEvaluation,
} from "@/services/practice.types";
import writingPracticeService from "@/services/writingPractice.service";
import { writingPracticeStorage } from "./writing-practice-storage";

const feedbackContext = (content: WritingPracticeContent) =>
  JSON.stringify({ version: WRITING_PRACTICE_FEEDBACK_VERSION, content });

export default function WritingPracticeTest() {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ownedAccess = useOwnedAccessContext({ scope: 'PRACTICE_WRITING', targetId: id });
  const ownerId = readAccessOwner();
  const resumeAccess = useMemo(() => {
    const saved = id && hasUnfinishedWritingPractice(id) ? readWritingPracticeAccess(id) : null;
    if (saved && saved.ownerId !== ownerId) return { error: 'Taslağınız korunuyor. Kendi hesabınızla devam edin.' };
    return { contextId: saved?.paidContinuationContextId || saved?.contextId || ownedAccess.accessContextId, paidContextId: saved?.paidContinuationContextId };
  }, [id, ownerId, ownedAccess.accessContextId]);
  const [reopenAccess, setReopenAccess] = useState<{ id: string; ownerId: string; contextId: string } | null>(null);
  const reopenContextId = reopenAccess && reopenAccess.id === id && reopenAccess.ownerId === ownerId ? reopenAccess.contextId : undefined;
  const contentAccessContextId = reopenContextId || resumeAccess.contextId;
  const [practice, setPractice] =
    useState<PracticeSolve<WritingPracticeContent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessError, setAccessError] = useState<unknown>(null);
  const paidContextRef = useRef<string | undefined>(undefined);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] =
    useState<WritingPracticeEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState("");
  const [showDescription, setShowDescription] = useState(true);
  const [showEvaluate, setShowEvaluate] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [characterCase, setCharacterCase] = useState<"lower" | "upper">(
    "lower",
  );
  const [fontScale] = useState(1);
  const [compactLayout, setCompactLayout] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedPracticeIdRef = useRef<string | null>(null);
  const evaluationControllerRef = useRef<AbortController | null>(null);
  const runRef = useRef<WritingPracticeRun | null>(null);
  const [inputMode, setInputMode] = useWritingInputMode(id ?? null, "practice");

  useEffect(() => {
    document.body.classList.add("exam-mode");
    return () => document.body.classList.remove("exam-mode");
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setCompactLayout(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    loadedPracticeIdRef.current = null;
    runRef.current = null;
    setAnswer("");
    setEvaluation(null);
    setEvaluationError("");
    setEvaluating(false);
    setError("");
    setLoading(true);
    paidContextRef.current = reopenContextId || resumeAccess.paidContextId;
    if (resumeAccess.error) { setError(resumeAccess.error); setLoading(false); return; }
    writingPracticeService
      .solve<WritingPracticeContent>(id, { accessContextId: contentAccessContextId })
      .then(async (value) => {
        if (!mounted || readAccessOwner() !== ownerId) return;
        setPractice(value);
        if (ownerId && contentAccessContextId) saveWritingPracticeAccess(id, ownerId, contentAccessContextId);
        loadedPracticeIdRef.current = id;
        try {
          const savedAnswer =
            writingPracticeStorage.getItem(`writing_practice_${id}`) || "";
          setAnswer(savedAnswer);
          const saved = JSON.parse(
            writingPracticeStorage.getItem(
              `writing_practice_evaluation_${id}`,
            ) || "null",
          );
          const context = feedbackContext(value.content);
          if (
            saved?.answerText === savedAnswer &&
            saved.context === context &&
            typeof saved.runId === "string" &&
            (!contentAccessContextId || saved.ownerId === readAccessOwner())
          ) {
            runRef.current = {
              runId: saved.runId,
              ownerId: saved.ownerId,
              accessContextId: saved.accessContextId,
              answerText: savedAnswer,
              context,
            };
            if (
              saved.evaluation?.answerText === savedAnswer &&
              saved.evaluation?.version === WRITING_PRACTICE_FEEDBACK_VERSION &&
              Array.isArray(saved.evaluation.corrections)
            )
              setEvaluation(saved.evaluation);
            else {
              const reconciled = await reconcileWritingPracticeRun(runRef.current, paidContextRef.current, () => writingPracticeService.getEvaluation(id, saved.runId));
              if (!mounted || readAccessOwner() !== ownerId) return;
              runRef.current = reconciled.run;
              if (reconciled.run.runId !== saved.runId) writingPracticeStorage.setItem(`writing_practice_evaluation_${id}`, JSON.stringify(reconciled.run));
              if (reconciled.result?.answerText === savedAnswer) setEvaluation(reconciled.result);
            }
          }
        } catch {
          // A blocked or invalid session cache must not prevent writing.
        }
      })
      .catch((reason) => {
        if (!mounted) return;
        setAccessError(reason);
        setError(getPracticeErrorMessage(reason, "Yazma pratiği yüklenemedi."));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      loadedPracticeIdRef.current = null;
      evaluationControllerRef.current?.abort();
      evaluationControllerRef.current = null;
    };
  }, [id, contentAccessContextId, ownerId, reopenContextId, resumeAccess.error, resumeAccess.paidContextId]);

  const task = useMemo(
    () => getWritingPracticeTasks(practice?.content ?? null)[0] ?? null,
    [practice],
  );
  const question = task?.questions?.[0] ?? null;
  const limits = task
    ? getWritingAnswerLimits(task)
    : { wordLimit: 350, characterLimit: 4200 };
  const wordCount = countWritingWords(answer);

  useEffect(() => {
    if (!id || loadedPracticeIdRef.current !== id || loading) return;
    try {
      writingPracticeStorage.setItem(`writing_practice_${id}`, answer);
    } catch {
      // Draft storage is optional when the browser blocks session storage.
    }
  }, [answer, id, loading]);

  useEffect(() => {
    if (!inputMode) setInputMode("turkish-keyboard");
  }, [inputMode, setInputMode]);

  const updateAnswer = (value: string) => {
    if (evaluating) return;
    setAnswer(limitWritingAnswer(value, limits).value);
    setEvaluation(null);
    setEvaluationError("");
  };

  const {
    cancelPendingLongPress,
    handleLongPressKeyDown,
    handleLongPressKeyUp,
    lastLongPressCharacter,
  } = useWritingTurkishLongPressInput({
    textareaRef,
    contextKey: id ?? "writing-practice",
    disabled: inputMode !== "long-press" || evaluating || !!evaluation,
    onValueChange: updateAnswer,
  });

  const insertCharacter = (character: string) => {
    if (evaluating || evaluation) return;
    cancelPendingLongPress();
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? answer.length;
    const end = textarea?.selectionEnd ?? answer.length;
    const nextValue = answer.slice(0, start) + character + answer.slice(end);
    updateAnswer(nextValue);
    window.requestAnimationFrame(() => {
      const caret = Math.min(start + character.length, nextValue.length);
      textareaRef.current?.setSelectionRange(caret, caret);
      textareaRef.current?.focus();
    });
  };

  const evaluateAnswer = async () => {
    if (!id || !practice || !answer.trim() || evaluationControllerRef.current)
      return;
    cancelPendingLongPress();
    const controller = new AbortController();
    evaluationControllerRef.current = controller;
    const answerText = answer;
    const context = feedbackContext(practice.content);
    const run =
      runRef.current?.answerText === answerText &&
      runRef.current.context === context
        ? runRef.current
        : { runId: crypto.randomUUID(), answerText, context, ...((paidContextRef.current || contentAccessContextId) ? { ownerId: readAccessOwner() || undefined, accessContextId: paidContextRef.current || contentAccessContextId } : {}) };
    runRef.current = run;
    try {
      writingPracticeStorage.setItem(
        `writing_practice_evaluation_${id}`,
        JSON.stringify(run),
      );
    } catch {
      // The server still identifies this run if local storage is unavailable.
    }
    setShowEvaluate(false);
    setEvaluating(true);
    setEvaluationError("");
    try {
      let result: WritingPracticeEvaluation;
      try {
        if (run.ownerId && run.ownerId !== readAccessOwner()) throw new Error('Hesabınız değişti. Bağlantıyı yeniden açın.');
        const evaluationAccess = run.accessContextId ? { accessContextId: run.accessContextId } : ownedAccess.forRun(run.runId);
        const activityOwner = readAccessOwner();
        if (activityOwner && (run.accessContextId || ownedAccess.accessContextId)) publishCurrentActivity(activityOwner, 'WRITING', { contentId: id, attemptId: run.runId, target: { scope: 'PRACTICE_WRITING', targetId: id } });
        result = await writingPracticeService.evaluate(
          id,
          run.runId,
          answerText,
          controller.signal,
          evaluationAccess,
        );
      } catch (reason) {
        const statusCode = (reason as { response?: { status?: number } })
          ?.response?.status;
        if (
          controller.signal.aborted ||
          (statusCode && statusCode !== 409 && statusCode < 500)
        )
          throw reason;
        // A timed-out response can still have completed on the server. Only
        // poll this run; never start another paid request automatically.
        let recovered: WritingPracticeEvaluation | null = null;
        for (
          let check = 0;
          check < 45 && !controller.signal.aborted;
          check += 1
        ) {
          const status = await writingPracticeService.getEvaluation(
            id,
            run.runId,
            controller.signal,
          );
          if (status.result) {
            recovered = status.result;
            break;
          }
          if (status.status !== "PENDING") throw reason;
          await new Promise<void>((resolve) => {
            const finish = () => {
              window.clearTimeout(timer);
              controller.signal.removeEventListener("abort", finish);
              resolve();
            };
            const timer = window.setTimeout(finish, 2000);
            controller.signal.addEventListener("abort", finish, { once: true });
          });
        }
        if (!recovered) throw reason;
        result = recovered;
      }
      if (controller.signal.aborted || loadedPracticeIdRef.current !== id)
        return;
      if (result.answerText !== answerText)
        throw new Error("Değerlendirme yazdığınız metinle eşleşmedi.");
      setEvaluation(result);
      try {
        writingPracticeStorage.setItem(
          `writing_practice_evaluation_${id}`,
          JSON.stringify({ ...run, evaluation: result }),
        );
      } catch {
        // Keep the visible result even if caching is unavailable.
      }
    } catch (reason) {
      setAccessError(reason);
      if (!controller.signal.aborted && loadedPracticeIdRef.current === id)
        setEvaluationError(
          getPracticeErrorMessage(
            reason,
            "Yazınız değerlendirilemedi. Metniniz korunuyor; yeniden deneyebilirsiniz.",
          ),
        );
    } finally {
      if (evaluationControllerRef.current === controller) {
        evaluationControllerRef.current = null;
        void queryClient.invalidateQueries({ queryKey: subscriptionStatusQueryKey });
        notifyAccessAllowanceChanged();
        if (loadedPracticeIdRef.current === id) setEvaluating(false);
      }
    }
  };

  if (!id) return <Navigate to="/app/pratik?bolum=writing" replace />;
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        Yükleniyor…
      </div>
    );
  if (!practice || !task || !question) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-[#5f5e5a]">
            {error || "Bu bölümde yazma görevi bulunamadı."}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => navigate("/app/pratik?bolum=writing")}
          >
            Pratiklere dön
          </Button>
          <ContentAccessRecovery error={accessError} target={{ scope: 'PRACTICE_WRITING', targetId: id }} onClose={() => setAccessError(null)} onPaid={contextId => {
            const currentOwner = readAccessOwner();
            if (!currentOwner) throw new Error('Hesabınız doğrulanamadı.');
            saveWritingPracticePaidContinuation(id, currentOwner, contextId);
            setReopenAccess({ id, ownerId: currentOwner, contextId });
          }} />
        </div>
      </div>
    );
  }

  const test = practice.content;
  const typography = getWritingTypographyPreset(fontScale);

  return (
    <div
      className="notranslate flex h-dvh min-h-0 flex-col overflow-hidden bg-white font-sans text-[#37352f]"
      translate="no"
      style={{ color: "#37352f", ...typography.style }}
    >
      <header className="z-50 shrink-0 border-b border-[#e5e5e2] bg-white">
        <div className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3 md:px-4 md:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-10 max-w-[120px] object-contain md:max-w-[150px]"
            />
            <span className="hidden h-5 w-px bg-[#dededb] sm:block" />
            <span className="truncate text-[17px] font-semibold">Yazma</span>
          </div>
          <PracticeDurationControl
            minutes={practice.estimatedMinutes}
            contextKey={`writing_${id}`}
            paused={evaluating || !!evaluation}
          />
          <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 md:col-span-1">
            <Select
              value={inputMode ?? "turkish-keyboard"}
              disabled={evaluating || !!evaluation}
              onValueChange={(value) => setInputMode(value as WritingInputMode)}
            >
              <SelectTrigger
                className="h-9 w-[150px] gap-2 rounded-md border border-[#e5e5e2] bg-[#f7f7f5] px-3 text-xs font-medium shadow-none"
                aria-label="Klavye yöntemi"
              >
                <Keyboard className="h-4 w-4" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--tm-border-subtle)] bg-white">
                <SelectItem
                  value="turkish-keyboard"
                  className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-white data-[state=checked]:focus:bg-white"
                >
                  Türkçe klavye
                </SelectItem>
                <SelectItem
                  value="long-press"
                  className="focus:bg-[var(--tm-bg-hover)] focus:text-[var(--tm-text-primary)] data-[state=checked]:bg-white data-[state=checked]:focus:bg-white"
                >
                  Basılı tutma
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setShowExit(true)}
              className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#777570] transition-colors hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
              aria-label="Çalışmadan çık"
            >
              <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <Button
              disabled={evaluating}
              onClick={() => {
                if (evaluation) {
                  setEvaluation(null);
                  return;
                }
                if (!answer.trim()) {
                  toast.error("Önce cevabınızı yazın.");
                  return;
                }
                setShowEvaluate(true);
              }}
              className="h-9 min-h-9 gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700"
            >
              {evaluating ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : evaluation ? (
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              {evaluating
                ? "Değerlendiriliyor"
                : evaluation
                  ? "Düzenlemeye dön"
                  : "Değerlendir"}
            </Button>
          </div>
        </div>
      </header>
      <PracticeAllowance target={{ scope: 'PRACTICE_WRITING', targetId: id }} />
      <ContentAccessRecovery error={accessError} target={{ scope: 'PRACTICE_WRITING', targetId: id }} onClose={() => setAccessError(null)} onPaid={async contextId => {
        const currentOwner = readAccessOwner();
        if (!id || !currentOwner) throw new Error('Hesabınız doğrulanamadı.');
        const previous = runRef.current;
        const reconciled = previous ? await reconcileWritingPracticeRun(previous, contextId, () => writingPracticeService.getEvaluation(id, previous.runId)) : null;
        if (readAccessOwner() !== currentOwner) throw new Error('Hesabınız değişti.');
        saveWritingPracticePaidContinuation(id, currentOwner, contextId);
        paidContextRef.current = contextId;
        if (reconciled) {
          runRef.current = reconciled.run;
          if (reconciled.run.runId !== previous?.runId) writingPracticeStorage.setItem(`writing_practice_evaluation_${id}`, JSON.stringify(reconciled.run));
          if (reconciled.result) setEvaluation(reconciled.result);
        }
        setEvaluationError('');
      }} />

      <section className="shrink-0 border-b border-[#e5e5e2] bg-white px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="reading-part-heading">
              {getWritingTaskSectionLabel(task.taskCode)}
            </h1>
            {showDescription ? (
              <p className="reading-part-description mt-0.5">
                {task.taskCode !== "TASK_2" ? `${task.label} · ` : ""}
                {getWritingStudentTaskMetadata(task)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowDescription((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6f6d67] hover:bg-[#f1f1ef]"
            aria-label="Bölüm açıklamasını aç veya kapat"
          >
            {showDescription ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </section>

      <ResizablePanelGroup
        key={compactLayout ? "compact" : "wide"}
        direction={compactLayout ? "vertical" : "horizontal"}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ResizablePanel
          defaultSize={compactLayout ? 35 : 47}
          minSize={compactLayout ? 20 : 35}
          maxSize={62}
          className="min-h-0 bg-white"
        >
          <div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
            <div className="mx-auto max-w-3xl">
              {task.taskCode !== "TASK_2" ? (
                <>
                  {test.instruction?.trim() ? (
                    <section className="mb-5 border-l-2 border-[#c9c8c4] pl-4">
                      <p className="reading-passage-copy font-normal text-[#242424]">
                        {test.instruction.trim()}
                      </p>
                    </section>
                  ) : null}
                  <section aria-labelledby="writing-practice-email-title">
                    <h2
                      id="writing-practice-email-title"
                      className="mb-3 text-[14px] font-semibold text-[#37352f]"
                    >
                      Gelen e-posta
                    </h2>
                    <WritingRichText
                      document={test.sourceEmail}
                      className="reading-passage-copy box-border w-full rounded-[4px] border border-[#cececa] bg-white px-4 py-3 font-normal text-[#242424]"
                    />
                  </section>
                </>
              ) : null}
              <section
                className={
                  task.taskCode === "TASK_2"
                    ? ""
                    : "mt-7 border-t border-[#dededb] pt-5"
                }
              >
                <h2 className="mb-3 text-[14px] font-semibold text-[#37352f]">
                  {task.taskCode === "TASK_2" ? "Konu" : "Sizden istenen"}
                </h2>
                <WritingRichText
                  document={task.promptJson}
                  spacing={task.taskCode === "TASK_2" ? "roomy" : "default"}
                  boxQuotedParagraph={task.taskCode === "TASK_2"}
                  className="reading-passage-copy font-normal text-[#242424]"
                />
              </section>
            </div>
          </div>
        </ResizablePanel>
        <ReadingSplitHandle
          direction={compactLayout ? "vertical" : "horizontal"}
        />
        <ResizablePanel
          defaultSize={compactLayout ? 65 : 53}
          minSize={38}
          className="min-h-0 bg-[#fbfbfa]"
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e2] px-4 py-3 md:px-6">
              <div>
                <h2 className="font-semibold text-[#242424]">Cevabınız</h2>
                <p
                  className={`mt-0.5 text-[13px] tabular-nums ${wordCount === 0 ? "text-[#9b9a97]" : wordCount < task.wordMin || wordCount > task.wordMax ? "text-[#92400e]" : "text-[#166534]"}`}
                >
                  {wordCount} / {getWritingWordTargetLabel(task)}
                </p>
              </div>
              <div
                className="flex items-center gap-1 rounded-md border border-[#dededb] bg-white p-0.5"
                aria-label="Türkçe karakterler"
              >
                <button
                  type="button"
                  disabled={evaluating || !!evaluation}
                  onClick={() =>
                    setCharacterCase((current) =>
                      current === "lower" ? "upper" : "lower",
                    )
                  }
                  aria-pressed={characterCase === "upper"}
                  className="flex h-7 min-w-9 items-center justify-center rounded px-1.5 text-[12px] font-semibold text-[#5f5e5a] hover:bg-[#efefed] hover:text-[#242424]"
                  title={
                    characterCase === "lower"
                      ? "Büyük harfleri göster"
                      : "Küçük harfleri göster"
                  }
                >
                  a/A
                </button>
                <span
                  className="mx-0.5 h-4 w-px bg-[#dededb]"
                  aria-hidden="true"
                />
                {TURKISH_CHARACTER_SHORTCUTS.map((shortcut) => {
                  const character = shortcut[characterCase];
                  return (
                    <button
                      key={character}
                      type="button"
                      disabled={evaluating || !!evaluation}
                      onClick={() => insertCharacter(character)}
                      className={`flex h-7 min-w-7 items-center justify-center rounded px-1 text-[14px] font-medium transition-colors ${
                        lastLongPressCharacter === character
                          ? "bg-[#e2f2dc] text-[#245c2a]"
                          : "text-[#5f5e5a] hover:bg-[#efefed] hover:text-[#242424]"
                      }`}
                      title={
                        inputMode === "long-press"
                          ? `${character} ekle — klavyede ${shortcut.key.toLocaleLowerCase("tr-TR")} harfini basılı tutun`
                          : `${character} ekle`
                      }
                    >
                      {character}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="flex min-h-0 flex-1 flex-col gap-2 bg-[#f7f7f5] p-3"
              aria-busy={evaluating}
            >
              {WRITING_PRACTICE_HELP_ENABLED && !evaluation ? (
                <WritingPracticeHelp key={id} practiceId={id!} answerText={answer} disabled={evaluating} />
              ) : null}
              {evaluation ? (
                <WritingPracticeCorrections evaluation={evaluation} />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={answer}
                  maxLength={limits.characterLimit}
                  disabled={evaluating}
                  aria-label="Yazma cevabınız"
                  onChange={(event) => updateAnswer(event.target.value)}
                  onKeyDown={handleLongPressKeyDown}
                  onKeyUp={handleLongPressKeyUp}
                  onBlur={cancelPendingLongPress}
                  onPointerDown={cancelPendingLongPress}
                  onCompositionStart={cancelPendingLongPress}
                  placeholder="Cevabınızı buraya yazın..."
                  spellCheck={false}
                  autoCapitalize="sentences"
                  className="reading-passage-copy min-h-0 w-full flex-1 resize-none rounded-md border border-[#dededb] bg-white px-4 py-3 font-normal text-[#242424] outline-none transition-colors placeholder:text-[#b4b4b0] focus:border-[#b4b4b0] sm:px-7 sm:py-6"
                />
              )}
              {evaluating ? (
                <p role="status" className="shrink-0 text-sm text-[#5f5e5a]">
                  Yazınız inceleniyor. Düzeltmeler bu metnin üzerinde görünecek.
                </p>
              ) : null}
              {evaluationError ? (
                <p role="alert" className="shrink-0 text-sm text-[#a33737]">
                  {evaluationError}
                </p>
              ) : null}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ConfirmationModal
        isOpen={showEvaluate}
        onClose={() => setShowEvaluate(false)}
        onConfirm={() => void evaluateAnswer()}
        title="Yazını değerlendir"
        message="Yazınız yapay zekâ ile değerlendirilecek. Yanlış ifadeler üstü çizili, doğru biçimleri yanında görünecek. Özgün metniniz korunur."
        confirmText="Değerlendir"
        cancelText="Devam et"
      />
      <ConfirmationModal
        isOpen={showExit}
        onClose={() => setShowExit(false)}
        onConfirm={() => {
          setShowExit(false);
          navigate("/app/pratik?bolum=writing");
        }}
        title={answer.trim() ? "Testten çıkılsın mı?" : "Çıkmak istiyor musun?"}
        message={
          answer.trim()
            ? "Şu ana kadarki yazın kaydedilir. Daha sonra kaldığın yerden devam edebilirsin."
            : "Henüz cevap vermedin. Daha sonra tekrar başlayabilirsin."
        }
        confirmText="Çık"
        cancelText="Kal"
      />
    </div>
  );
}
