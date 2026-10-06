import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ExamSession } from "@/data/exam-information";
import {
  useSaveStudentOnboarding,
  type StudentGoal,
  type StudentOnboarding,
} from "./onboarding-api";
import { goalLabels, sessionLabel } from "./dashboard-goal-data";

// Mounted when opened: each editing session starts from the latest saved profile.
export function DashboardGoalDialog({
  profile,
  session,
  today,
  dateOnly = false,
  levelOnly = false,
  sessions: officialSessions = [],
  calendarUnavailable = false,
  onClose,
}: {
  profile?: StudentOnboarding | null;
  session?: ExamSession;
  today: string;
  dateOnly?: boolean;
  levelOnly?: boolean;
  sessions?: ExamSession[];
  calendarUnavailable?: boolean;
  onClose: () => void;
}) {
  const save = useSaveStudentOnboarding(profile);
  const [step, setStep] = useState(levelOnly ? 1 : dateOnly || session ? 2 : 0);
  const [goal, setGoal] = useState<StudentGoal>(
    dateOnly || session ? "EXAM_PREPARATION" : (profile?.goal ?? "EXAM_PREPARATION"),
  );
  const [targetLevel, setTargetLevel] = useState<
    StudentOnboarding["targetLevel"]
  >(profile?.targetLevel ?? null);
  const [sessionId, setSessionId] = useState(
    session?.id ?? (profile?.examTarget === "CEFR" ? profile.examSessionId ?? "" : ""),
  );
  const sessions = officialSessions.filter(item => item.published && item.examEnd >= today)
    .sort((a, b) => a.examStart.localeCompare(b.examStart));
  const selectedSession = sessions.find(item => item.id === sessionId);
  async function submit() {
    if (levelOnly) {
      try {
        await save.mutateAsync({targetLevel: targetLevel ?? null});
        onClose();
      } catch { /* Preserve selection for retry. */ }
      return;
    }
    const usesExam = goal === "EXAM_PREPARATION";
    const official = usesExam ? selectedSession : undefined;
    if (usesExam && (!official || calendarUnavailable)) return;
    try {
      await save.mutateAsync({
        goal,
        targetLevel: targetLevel ?? null,
        currentLevel: profile?.currentLevel ?? "UNSURE",
        supportLanguage: profile?.supportLanguage ?? "TURKISH",
        dailyStudyMinutes: profile?.dailyStudyMinutes ?? 20,
        examTarget: usesExam ? "CEFR" : "UNDECIDED",
        targetExamYear: official ? Number(official.examStart.slice(0, 4)) : null,
        examSessionId: official?.id ?? null,
        examDate: official?.examStart ?? null,
      });
      onClose();
    } catch {
      /* Keep the draft and show the retryable error below. */
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="dashboard-goal-dialog" overlayClassName="dashboard-goal-overlay">
        <DialogHeader className="dashboard-goal-dialog__header">
          <DialogTitle>{levelOnly ? "Hedef seviyeniz" : dateOnly ? "Sınav tarihinizi seçin" : "Hedefinizi belirleyin"}</DialogTitle>
          <DialogDescription>
            {levelOnly ? "Ulaşmak istediğiniz seviyeyi seçin. İstediğiniz zaman değiştirebilirsiniz." : dateOnly ? "Millî CEFR · Türkçe" : "Size uygun bir gelişim özeti için üç kısa soru."}
          </DialogDescription>
        </DialogHeader>
        {!dateOnly && !levelOnly && <div
          className="dashboard-goal-dialog__steps"
          aria-label={`Adım ${step + 1} / 3`}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} data-active={i <= step} />
          ))}
        </div>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 2 && !levelOnly) setStep(step + 1);
            else void submit();
          }}
        >
          {step === 0 && (
            <fieldset>
              <legend>Türkçeyi ne için çalışıyorsunuz?</legend>
              <div className="dashboard-goal-dialog__options">
                {Object.entries(goalLabels).map(([value, label]) => (
                  <label key={value} data-selected={goal === value}>
                    <input
                      type="radio"
                      name="goal"
                      value={value}
                      checked={goal === value}
                      onChange={() => setGoal(value as StudentGoal)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {step === 1 && (
            <fieldset disabled={save.isPending}>
              <legend className={levelOnly ? "sr-only" : undefined}>Hangi seviyeye ulaşmak istiyorsunuz?</legend>
              {!levelOnly && <p>Bu, şu anki seviyeniz değil; ulaşmak istediğiniz hedef.</p>}
              <div className="dashboard-goal-dialog__levels">
                {(["B1", "B2", "C1"] as const).map((level) => (
                  <label key={level} data-selected={targetLevel === level}>
                    <input
                      type="radio"
                      name="level"
                      checked={targetLevel === level}
                      onChange={() => setTargetLevel(level)}
                    />
                    {level}
                  </label>
                ))}
              </div>
              <label className="dashboard-goal-dialog__undecided">
                <input
                  type="radio"
                  name="level"
                  checked={!targetLevel}
                  onChange={() => setTargetLevel(null)}
                />
                Henüz karar vermedim
              </label>
            </fieldset>
          )}
          {step === 2 &&
            (goal === "EXAM_PREPARATION" ? (
              <fieldset disabled={save.isPending}>
                <legend>Resmî sınav dönemleri</legend>
                <div className="dashboard-goal-dialog__options dashboard-exam-periods">
                  {sessions.map(item => (
                    <label key={item.id} data-selected={selectedSession?.id === item.id}>
                      <input type="radio" name="exam-session" value={item.id}
                        checked={selectedSession?.id === item.id}
                        onChange={() => setSessionId(item.id)} />
                      {sessionLabel(item)}
                    </label>
                  ))}
                </div>
                {calendarUnavailable ? <p role="status">Takvim şu anda kullanılamıyor. Lütfen yeniden deneyin.</p> : !sessions.length && <p>Yaklaşan resmî sınav dönemi henüz yayımlanmadı.</p>}
                <p>
                  Bu seçim sınav kaydı oluşturmaz. Başvuru ayrıca resmî siteden
                  yapılır.
                </p>
              </fieldset>
            ) : (
              <fieldset>
                <legend>Hedefiniz hazır</legend>
                <p>
                  {goalLabels[goal]}
                  {targetLevel ? ` · Hedef: ${targetLevel}` : ""}
                </p>
                <p>Hedefinizi istediğiniz zaman değiştirebilirsiniz.</p>
              </fieldset>
            ))}
          {save.isError && (
            <p className="dashboard-goal-dialog__error" role="alert">
              Hedefiniz kaydedilemedi. Bilgileriniz burada duruyor; yeniden
              deneyebilirsiniz.
            </p>
          )}
          <div className="dashboard-goal-dialog__footer">
            <button
              type="button"
              onClick={() => (!dateOnly && !levelOnly && step ? setStep(step - 1) : onClose())}
              disabled={save.isPending}
            >
              {dateOnly || levelOnly ? "Vazgeç" : step ? "Geri" : "Daha sonra"}
            </button>
            <button
              className="dashboard-goal-dialog__save"
              type="submit"
              disabled={save.isPending || (step === 2 && goal === "EXAM_PREPARATION" && (!selectedSession || calendarUnavailable))}
            >
              {save.isPending
                ? "Kaydediliyor…"
                : step === 2 || levelOnly
                  ? "Kaydet"
                  : "Devam"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
