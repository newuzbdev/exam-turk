import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type StudentCurrentLevel,
  type StudentExamTarget,
  type StudentGoal,
  type StudentOnboarding,
  type StudentOnboardingInput,
  type StudentSupportLanguage,
  useSaveStudentOnboarding,
} from "./onboarding-api";

export const goalLabels: Record<StudentGoal, string> = {
  START_TURKISH: "Sıfırdan Türkçe öğrenmek",
  EXAM_PREPARATION: "TYS/CEFR sınavına hazırlanmak",
  IMPROVE_SPEAKING: "Konuşmamı geliştirmek",
  IMPROVE_WRITING: "Yazmamı geliştirmek",
  GENERAL_TURKISH: "Genel Türkçemi geliştirmek",
};

export const levelLabels: Record<StudentCurrentLevel, string> = {
  NONE: "Hiç bilmiyorum",
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
  UNSURE: "Emin değilim",
};

export const supportLanguageLabels: Record<StudentSupportLanguage, string> = {
  TURKISH: "Türkçe",
  UZBEK: "Özbekçe",
  ENGLISH: "İngilizce",
  RUSSIAN: "Rusça",
  OTHER: "Diğer",
};

export const examTargetLabels: Record<StudentExamTarget, string> = {
  TYS: "TYS",
  CEFR: "CEFR",
  UNDECIDED: "Henüz bilmiyorum",
};

const minuteLabels = {
  10: "10 dakika",
  20: "20 dakika",
  30: "30 dakika",
  60: "1 saat+",
} as const;

const defaultForm: StudentOnboardingInput = {
  goal: "GENERAL_TURKISH",
  currentLevel: "UNSURE",
  supportLanguage: "TURKISH",
  examTarget: "UNDECIDED",
  dailyStudyMinutes: 20,
  examDate: null,
};

interface StudentOnboardingDialogProps {
  profile: StudentOnboarding | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Option<T extends string | number> {
  value: T;
  label: string;
}

function OptionList<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            className={cn(
              "flex min-h-12 items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
              selected
                ? "border-[var(--tm-text-primary)] bg-[var(--tm-bg-muted)] text-[var(--tm-text-primary)]"
                : "border-[var(--tm-border-default)] bg-white text-[var(--tm-text-secondary)] hover:bg-[var(--tm-bg-hover)]",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function StudentOnboardingDialog({
  profile,
  open,
  onOpenChange,
}: StudentOnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<StudentOnboardingInput>(defaultForm);
  const [hasExamDate, setHasExamDate] = useState(false);
  const saveMutation = useSaveStudentOnboarding(profile);

  useEffect(() => {
    if (!open) return;

    setStep(0);
    if (profile) {
      setForm({
        goal: profile.goal,
        currentLevel: profile.currentLevel,
        supportLanguage: profile.supportLanguage,
        examTarget: profile.examTarget,
        dailyStudyMinutes: profile.dailyStudyMinutes,
        examDate: profile.examDate?.slice(0, 10) ?? null,
      });
      setHasExamDate(Boolean(profile.examDate));
      return;
    }

    setForm(defaultForm);
    setHasExamDate(false);
  }, [open, profile]);

  const steps = useMemo(
    () => [
      {
        title: "Hedefin ne?",
        description: "Çalışma alanını sana uygun hale getirebilmemiz için.",
        content: (
          <OptionList
            options={Object.entries(goalLabels).map(([value, label]) => ({
              value: value as StudentGoal,
              label,
            }))}
            value={form.goal}
            onChange={(goal) => setForm((current) => ({ ...current, goal }))}
          />
        ),
      },
      {
        title: "Şu anki seviyen ne?",
        description: "Emin değilsen daha sonra seviye testiyle netleştirebilirsin.",
        content: (
          <OptionList
            options={Object.entries(levelLabels).map(([value, label]) => ({
              value: value as StudentCurrentLevel,
              label,
            }))}
            value={form.currentLevel}
            onChange={(currentLevel) =>
              setForm((current) => ({ ...current, currentLevel }))
            }
          />
        ),
      },
      {
        title: "Açıklama dili",
        description: "Ders açıklamalarını hangi dilde almak istersin?",
        content: (
          <OptionList
            options={Object.entries(supportLanguageLabels).map(
              ([value, label]) => ({
                value: value as StudentSupportLanguage,
                label,
              }),
            )}
            value={form.supportLanguage}
            onChange={(supportLanguage) =>
              setForm((current) => ({ ...current, supportLanguage }))
            }
          />
        ),
      },
      {
        title: "Sınav hedefin ne?",
        description: "Bir sınava hazırlanmıyorsan bunu boş bırakabilirsin.",
        content: (
          <OptionList
            options={Object.entries(examTargetLabels).map(([value, label]) => ({
              value: value as StudentExamTarget,
              label,
            }))}
            value={form.examTarget}
            onChange={(examTarget) =>
              setForm((current) => ({ ...current, examTarget }))
            }
          />
        ),
      },
      {
        title: "Günde ne kadar çalışabilirsin?",
        description: "Gerçekçi bir süre seçmek düzenli çalışmayı kolaylaştırır.",
        content: (
          <OptionList
            options={Object.entries(minuteLabels).map(([value, label]) => ({
              value: Number(value) as 10 | 20 | 30 | 60,
              label,
            }))}
            value={form.dailyStudyMinutes}
            onChange={(dailyStudyMinutes) =>
              setForm((current) => ({ ...current, dailyStudyMinutes }))
            }
          />
        ),
      },
      {
        title: "Sınav tarihin belli mi?",
        description: "Tarihi bilmiyorsan daha sonra ekleyebilirsin.",
        content: (
          <div className="space-y-3">
            <OptionList
              options={[
                { value: "KNOWN", label: "Tarihi biliyorum" },
                { value: "UNKNOWN", label: "Henüz belli değil" },
              ]}
              value={hasExamDate ? "KNOWN" : "UNKNOWN"}
              onChange={(value) => {
                const known = value === "KNOWN";
                setHasExamDate(known);
                if (!known) {
                  setForm((current) => ({ ...current, examDate: null }));
                }
              }}
            />
            {hasExamDate ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[var(--tm-text-secondary)]">
                  Sınav tarihi
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tm-text-tertiary)]" />
                  <input
                    type="date"
                    value={form.examDate ?? ""}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        examDate: event.target.value || null,
                      }))
                    }
                    className="h-11 w-full rounded-md border border-[var(--tm-border-default)] bg-white pl-10 pr-3 text-sm text-[var(--tm-text-primary)] outline-none focus:border-[var(--tm-text-primary)]"
                  />
                </div>
              </label>
            ) : null}
          </div>
        ),
      },
    ],
    [form, hasExamDate],
  );

  const isLastStep = step === steps.length - 1;
  const canSubmit = !hasExamDate || Boolean(form.examDate);

  const submit = async () => {
    await saveMutation.mutateAsync({
      ...form,
      examDate: hasExamDate ? form.examDate : null,
    });
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg border-[var(--tm-border-default)] p-5 sm:p-6">
        <DialogHeader className="pr-8">
          <p className="text-xs font-semibold text-[var(--tm-text-tertiary)]">
            {profile ? "Hedeflerini düzenle" : "Başlangıç ayarları"} ·{" "}
            {step + 1}/{steps.length}
          </p>
          <DialogTitle className="text-xl text-[var(--tm-text-primary)]">
            {steps[step].title}
          </DialogTitle>
          <DialogDescription className="leading-6 text-[var(--tm-text-secondary)]">
            {steps[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="h-1 overflow-hidden rounded-full bg-[var(--tm-bg-muted)]">
          <div
            className="h-full bg-[var(--tm-text-primary)] transition-[width]"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="py-2">{steps[step].content}</div>

        {saveMutation.isError ? (
          <p className="text-sm font-medium text-red-600">
            Bilgilerin kaydedilemedi. Lütfen tekrar dene.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--tm-text-secondary)] hover:bg-[var(--tm-bg-hover)] disabled:opacity-40"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || saveMutation.isPending}
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--tm-text-primary)] px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              isLastStep ? void submit() : setStep((current) => current + 1)
            }
            disabled={
              saveMutation.isPending || (isLastStep && !canSubmit)
            }
          >
            {isLastStep
              ? saveMutation.isPending
                ? "Kaydediliyor..."
                : profile
                  ? "Değişiklikleri kaydet"
                  : "Tamamla"
              : "Devam"}
            {!isLastStep ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
