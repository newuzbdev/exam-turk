import { useCallback, useRef, useState } from 'react';
import WorkbookDocument from './WorkbookDocument';
import { WorkbookActivityContext } from './WorkbookActivityContext';
import { guidedWorkbookSteps, stepReady } from './guided-workbook';
import { workbookText, type WorkbookLanguage } from './workbook-language';
import type { WorkbookDocument as Document, StudentExerciseSubmission } from './types';
import type { ExerciseSubmitResult } from './WorkbookExercise';

export default function GuidedWorkbook({ document, language, onSubmit, answerMode = 'student' }: {
  document: Document; language: WorkbookLanguage;
  onSubmit?: (submission: StudentExerciseSubmission) => Promise<ExerciseSubmitResult>;
  answerMode?: 'student' | 'preview';
}) {
  const steps = guidedWorkbookSteps(document.blocks);
  const [current, setCurrent] = useState(0);
  const [activity, setActivity] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const record = useCallback((id: string, ready: boolean) => setActivity(old => old[id] === ready ? old : {...old, [id]:ready}), []);
  if (!steps.length) return <WorkbookDocument document={document} language={language} onSubmit={onSubmit} answerMode={answerMode} />;
  const step = steps[Math.min(current, steps.length - 1)];
  const ready = stepReady(step.blocks, activity);
  const uz = language === 'uz';
  const go = (next: number) => {
    setCurrent(next);
    requestAnimationFrame(() => { heading.current?.focus({preventScroll:true}); heading.current?.scrollIntoView({block:'start',behavior:'smooth'}); });
  };
  return <WorkbookActivityContext.Provider value={record}><div className="guided-workbook" lang={language}>
    <div className="guided-progress"><span>{uz ? 'Qadam' : 'Adım'} {current + 1} / {steps.length}</span><progress aria-label={uz ? 'Darsdagi qadam' : 'Ders adımı'} value={current + 1} max={steps.length} /></div>
    <h2 className="guided-step-heading" ref={heading} tabIndex={-1}>{workbookText(step.title, language).replace(/^\d+\.\s*/, '')}</h2>
    {steps.map((item,index) => <section key={item.id} hidden={index !== current}>
      <WorkbookDocument document={{...document,blocks:item.blocks}} language={language} answerMode={answerMode} onSubmit={onSubmit} exerciseStart={item.exerciseStart} compactTips />
    </section>)}
    <div className="guided-navigation">
      <button type="button" disabled={current === 0} onClick={() => go(current - 1)}>{uz ? 'Oldingi' : 'Önceki'}</button>
      {current < steps.length - 1 ? <button type="button" disabled={!ready} onClick={() => go(current + 1)}>{uz ? 'Davom etish' : 'Devam et'}</button>
        : <button type="button" onClick={() => setReviewed(true)}>{uz ? 'Takrorlash rejasini ko‘rdim' : 'Tekrar planını inceledim'}</button>}
    </div>
    {!ready ? <p className="guided-next-help" role="status">{uz ? 'Davom etishdan oldin javoblarni tekshiring. Yozma javobingizni namuna bilan solishtiring.' : 'İlerlemeden önce cevapları kontrol edin. Yazdığınız cevabı örnekle karşılaştırın.'}</p> : null}
    {reviewed && current === steps.length - 1 ? <p role="status" className="guided-next-help">{uz ? 'Dars mashqlari tugadi. Ertaga namunasiz yangi bir xat yozib ko‘ring. Bu imtihon bahosi emas.' : 'Ders çalışması bitti. Yarın örneğe bakmadan yeni bir mektup yazmayı deneyin. Bu bir sınav değerlendirmesi değildir.'}</p> : null}
  </div></WorkbookActivityContext.Provider>;
}
