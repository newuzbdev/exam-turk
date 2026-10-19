import { useEffect, useRef, useState } from 'react';
import type { ExamSession } from '@/data/exam-information';
import { examDateLabel } from '@/data/exam-information';
import type { StudentCurrentLevel, StudentOnboarding, StudentOnboardingInput } from '@/pages/dashboard/onboarding-api';
import { firstRunInput, upcomingPeriods } from './first-run-model';
import './first-run.css';

const levels: Array<[StudentCurrentLevel, string]> = [
  ['NONE', 'Yeni başlıyorum'],
  ['A1', 'A1'], ['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2'], ['C1', 'C1'],
  ['UNSURE', 'Emin değilim'],
];
const titles = ['Türkçe seviyeniz?', 'Hedef seviyeniz?', 'Sınav tarihiniz?'];
const descriptions = ['Size en yakın seçeneği seçin.', 'Millî CEFR çalışmaları · B1–C1', 'Millî CEFR · Türkçe'];

export function FirstRunSetup({ profile, sessions, today, calendarPending = false, calendarError = false, onCalendarRetry, onSave, onSkip }: {
  profile?: StudentOnboarding | null;
  sessions: ExamSession[];
  today: string;
  calendarPending?: boolean;
  calendarError?: boolean;
  onCalendarRetry?: () => void;
  onSave: (input: StudentOnboardingInput) => Promise<unknown>;
  onSkip: () => void;
}) {
  const periods = upcomingPeriods(sessions, today);
  const [step, setStep] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<StudentCurrentLevel | ''>(profile?.currentLevel ?? '');
  const [targetLevel, setTargetLevel] = useState<'B1' | 'B2' | 'C1' | ''>(profile?.targetLevel ?? '');
  const [sessionId, setSessionId] = useState(profile?.examSessionId ?? '');
  const [examChoice, setExamChoice] = useState<'session' | 'undecided' | ''>(profile?.examSessionId ? 'session' : '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const selected = periods.find(item => item.id === sessionId);
  const valid = step === 0 ? Boolean(currentLevel) : step === 1 ? Boolean(targetLevel) : examChoice === 'undecided' || Boolean(examChoice === 'session' && selected && !calendarPending && !calendarError);

  async function submit() {
    if (!valid || pending) return;
    if (step < 2) { setStep(step + 1); return; }
    if (!currentLevel || !targetLevel) return;
    setPending(true); setError(false);
    try { await onSave(firstRunInput(profile, currentLevel, targetLevel, examChoice === 'session' ? selected : undefined)); }
    catch { setError(true); }
    finally { setPending(false); }
  }

  return <main className="first-run">
    <header className="first-run__top"><span className="first-run__brand">TURKISHMOCK</span>
      <button type="button" className="first-run__quiet" disabled={pending} onClick={onSkip}>Şimdilik geç</button>
    </header>
    <section className="first-run__card first-run__question-card" data-step={step + 1} aria-labelledby="first-run-title">
      <div className="first-run__eyebrow">Sizi tanıyalım <span>{step + 1} / 3</span></div>
      <div className="first-run__progress" aria-label={`Adım ${step + 1} / 3`}>{[0, 1, 2].map(index => <span key={index} data-active={index <= step} />)}</div>
      <div className="first-run__question-heading">
        <h1 id="first-run-title" tabIndex={-1} ref={heading}>{titles[step]}</h1>
        <p className="first-run__intro">{descriptions[step]}</p>
      </div>
      <form className="first-run__form" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="first-run__answers">
        <fieldset disabled={pending}>
          <legend className="sr-only">{titles[step]}</legend>
          {step === 0 && <div className="first-run__choices first-run__choices--levels">{levels.map(([value, label]) =>
            <label key={value} data-selected={currentLevel === value}>
              <input type="radio" name="current-level" value={value} checked={currentLevel === value} onChange={() => setCurrentLevel(value)} />
              <strong>{label}</strong>
            </label>)}</div>}
          {step === 0 && ['NONE', 'A1', 'A2'].includes(currentLevel) && <p className="first-run__scope" role="note" data-level-scope>
            İçerikler B1’den başlar. A1–A2 temel dersleri henüz yok.
          </p>}
          {step === 1 && <div className="first-run__choices first-run__choices--targets">{(['B1', 'B2', 'C1'] as const).map(level =>
            <label key={level} data-selected={targetLevel === level}>
              <input type="radio" name="target-level" value={level} checked={targetLevel === level} onChange={() => setTargetLevel(level)} />
              <strong>{level}</strong>
            </label>)}</div>}
          {step === 2 && <div className="first-run__calendar">
            {calendarPending ? <p role="status">Sınav takvimi yükleniyor…</p> : calendarError ? <p role="status">Sınav takvimi şu anda yüklenemedi. <button type="button" className="first-run__text-button" onClick={onCalendarRetry}>Tekrar dene</button></p> : !periods.length ? <p>Yaklaşan sınav dönemleri henüz yayımlanmadı.</p> : null}
            <div className="first-run__choices first-run__periods">
              {!calendarError && !calendarPending && periods.map(item => <label key={item.id} data-selected={examChoice === 'session' && selected?.id === item.id}>
                <input type="radio" name="exam-period" value={item.id} checked={examChoice === 'session' && selected?.id === item.id} onChange={() => { setSessionId(item.id); setExamChoice('session'); }} />
                <strong>{examDateLabel(item.examStart, 'tr')} – {examDateLabel(item.examEnd, 'tr')} {item.examStart.slice(0, 4)}</strong>
              </label>)}
              <label data-selected={examChoice === 'undecided'}><input type="radio" name="exam-period" value="undecided" checked={examChoice === 'undecided'} onChange={() => { setExamChoice('undecided'); setSessionId(''); }} /><strong>Henüz karar vermedim</strong></label>
            </div>
            <p className="first-run__note">Bu seçim sınav başvurusu oluşturmaz.</p>
          </div>}
        </fieldset>
        </div>
        {error && <p role="alert" className="first-run__error">Bilgileriniz kaydedilemedi. Seçimleriniz burada duruyor; yeniden deneyebilirsiniz.</p>}
        <div className="first-run__footer">
          {step > 0 ? <button type="button" className="first-run__quiet" disabled={pending} onClick={() => { setError(false); setStep(step - 1); }}>Geri</button> : <span className="first-run__note">Yalnızca üç kısa soru.</span>}
          <button className="first-run__primary" type="submit" disabled={!valid || pending}>{pending ? 'Kaydediliyor…' : step === 2 ? 'Kaydet ve devam et' : 'Devam'}</button>
        </div>
      </form>
    </section>
  </main>;
}
