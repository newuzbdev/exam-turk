import { useContext, useId, useLayoutEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { useWorkbookLanguage } from './WorkbookLanguageContext';
import { workbookLabel } from './workbook-language';
import { WorkbookActivityContext } from './WorkbookActivityContext';
import { buildStudentSubmission, checkPreviewAnswer, numberedExerciseTitle, workbookAnswerReducer } from './document-utils';
import type { ExerciseBlock, StudentExerciseSubmission, WorkbookFeedback } from './types';

export type ExerciseSubmitResult = { correct: boolean; feedback: string };

export default function WorkbookExercise({
  block,
  number,
  answerMode,
  onSubmit,
  style,
}: {
  block: ExerciseBlock;
  number: number;
  answerMode: 'preview' | 'student';
  onSubmit?: (submission: StudentExerciseSubmission) => Promise<ExerciseSubmitResult>;
  style?: CSSProperties;
}) {
  const id = useId();
  const recordActivity = useContext(WorkbookActivityContext);
  const language = useWorkbookLanguage();
  const label = (value: string) => workbookLabel(value, language);
  const answerLabel = language === 'uz' ? `${number}-mashq javobingiz` : `${number}. alıştırma cevabınız`;
  const [{ value, checked }, dispatch] = useReducer(workbookAnswerReducer, { value: '', checked: false });
  const wordCount = value.trim() ? value.trim().split(/\s+/u).length : 0;
  const finalLetter = block.kind === 'reflection' && block.id === 'formal-independent';
  const lengthReady = !finalLetter || (wordCount >= 120 && wordCount <= 150);
  const [serverFeedback, setServerFeedback] = useState<WorkbookFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const feedback = checked ? (serverFeedback ?? (answerMode === 'preview' || block.kind === 'reflection' ? checkPreviewAnswer(block, value) : null)) : null;
  const change = (next: string) => { dispatch({ type: 'change', value: next }); setServerFeedback(null); recordActivity(block.id, false); };

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    const resize = () => { element.style.height = 'auto'; element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`; };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => { if (element.clientWidth !== width) { width = element.clientWidth; resize(); } });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  async function check() {
    dispatch({ type: 'check' });
    if (answerMode === 'preview' || block.kind === 'reflection') {
      const checkedAnswer = checkPreviewAnswer(block, value);
      recordActivity(block.id, checkedAnswer.kind === 'correct' || (checkedAnswer.kind === 'compare' && lengthReady));
      return;
    }
    const submission = buildStudentSubmission(block, value);
    if (!submission) {
      setServerFeedback({ kind: 'empty', message: value.trim() ? 'Bu alıştırma henüz gönderime hazır değil.' : block.kind === 'choice' ? 'Önce bir seçenek seçin.' : 'Önce cevabınızı yazın.' });
      return;
    }
    if (!onSubmit) {
      setServerFeedback({ kind: 'retry', message: 'Cevap gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSubmit(submission);
      recordActivity(block.id, result.correct);
      setServerFeedback({ kind: result.correct ? 'correct' : 'retry', message: result.feedback || (result.correct ? 'Cevabınız doğru.' : 'Cevabınızı yeniden düşünün.') });
    } catch {
      setServerFeedback({ kind: 'retry', message: 'Cevap gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.' });
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="workbook-question" data-tone={block.tone} data-custom-font-size={Boolean(block.style?.fontSize)} style={style} onSubmit={event => { event.preventDefault(); void check(); }} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{numberedExerciseTitle(number, block.title)}</h3>
    <p id={`${id}-instruction`}>{block.instruction}</p>
    {block.kind === 'blank' ? <p className="workbook-blank-line" lang="tr">
      <label htmlFor={`${id}-answer`}>{block.before}</label>{' '}
      <input id={`${id}-answer`} className="workbook-blank" aria-label={answerLabel} aria-describedby={`${id}-instruction`} disabled={submitting} autoComplete="off" type="text" value={value} onChange={event => change(event.target.value)} placeholder={label('buraya yazın')} maxLength={150} />{' '}{block.after}
    </p> : block.kind === 'choice' ? <fieldset lang="tr" className="workbook-choices" aria-labelledby={`${id}-instruction`}>
      {block.options.map(option => <label key={option.id}><input disabled={submitting} type="radio" name={`${id}-choice`} value={option.id} checked={value === option.id} onChange={() => change(option.id)} /><span>{option.text}</span></label>)}
    </fieldset> : <textarea disabled={submitting} lang="tr" ref={field} className="workbook-writing" id={`${id}-answer`} rows={3} value={value} aria-label={answerLabel} aria-describedby={`${id}-instruction`} placeholder={label('Düşüncenizi buraya yazın…')} onChange={event => change(event.target.value)} maxLength={5000} />}
    {block.kind === 'reflection' ? <p className="workbook-word-count" aria-live="polite" data-outside-target={finalLetter && !lengthReady}>{wordCount} {language === 'uz' ? 'so‘z' : 'kelime'}{finalLetter ? (language === 'uz' ? ' · Maqsad: 120–150 so‘z. Keyin namuna bilan solishtiring.' : ' · Hedef: 120–150 kelime. Ardından örnekle karşılaştırın.') : ''}</p> : null}
    <button className="workbook-check" type="submit" disabled={submitting}>{label(submitting ? 'Kontrol ediliyor…' : block.kind === 'reflection' ? 'Örnek yanıtla karşılaştır' : 'Kontrol et')}<ArrowRight size={14} aria-hidden="true" /></button>
    <div aria-live="polite" aria-atomic="true">{feedback ? <div className="workbook-feedback" data-kind={feedback.kind}>
      {feedback.kind === 'compare' ? <><h4>{label('Örnek yanıt')}</h4><p lang="tr">{feedback.message}</p><ul>{block.kind === 'reflection' ? block.checklist.map(item => <li key={item}>{item}</li>) : null}</ul><p className="workbook-feedback-note">{label('Bu açık uçlu yanıt otomatik puanlanmaz. Aynı fikri farklı kelimelerle doğru anlatabilirsiniz.')}</p></> : <><h4>{feedback.kind === 'correct' ? <><Check size={16} aria-hidden="true" /> {label('Doğru')}</> : feedback.kind === 'retry' ? <><RotateCcw size={15} aria-hidden="true" /> {label('Bir daha düşünün')}</> : label('Cevabınızı ekleyin')}</h4><p>{label(feedback.message)}</p></>}
    </div> : null}</div>
  </form>;
}
