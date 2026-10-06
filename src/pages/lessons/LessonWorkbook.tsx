import { useId, useLayoutEffect, useReducer, useRef } from 'react';
import { Check, ArrowRight, RotateCcw } from 'lucide-react';
import { checkWorkbookAnswer, workbookAnswerReducer, type WorkbookExercise, type LessonWorkbookContent } from './lesson-workbook';
import './lesson-workbook.css';

export default function LessonWorkbook({ content }: { content: LessonWorkbookContent }) {
  return <article className="lesson-workbook" aria-label="Ders anlatımı ve alıştırmalar">
    <header className="workbook-intro">
      <h2>{content.title}</h2>
      <p>{content.introduction}</p>
      <p className="workbook-reminder">{content.reminder}</p>
    </header>

    <section className="workbook-section" aria-labelledby="workbook-example-title">
      <h3 id="workbook-example-title">Bir örnek üzerinden bakalım</h3>
      <p>Aşağıdaki kısa konuşma metnini okuyun.</p>
      <figure className="workbook-figure">
        <img src={content.visual.src} alt={content.visual.alt} width={content.visual.width} height={content.visual.height} loading="lazy" decoding="async" />
        <figcaption>{content.visual.caption}</figcaption>
      </figure>
      <blockquote>{content.example}</blockquote>
      <table className="workbook-table">
        <caption>Konuyu, ana fikri ve ayrıntıyı ayırma</caption>
        <thead><tr><th scope="col">Ne arıyoruz?</th><th scope="col">Bu konuşmada</th></tr></thead>
        <tbody>{content.rows.map(row => <tr key={row.label} data-emphasis={row.emphasis}>
          <th scope="row">{row.label}<span>{row.hint}</span></th>
          <td>{row.text}</td>
        </tr>)}</tbody>
      </table>
      <aside className="workbook-tip" aria-label="İpucu">
        <strong>İpucu</strong>
        <p>{content.tip}</p>
      </aside>
    </section>

    <section className="workbook-practice" aria-labelledby="workbook-practice-title">
      <h2 id="workbook-practice-title">Sıra sizde</h2>
      <p>Cevaplarınızı doğrudan sayfaya yazın.</p>
      {content.exercises.map((exercise, index) => <WorkbookQuestion key={exercise.id} exercise={exercise} number={index + 1} />)}
    </section>
    <p className="workbook-preview-note">Bu, tasarımı denemeniz için hazırlanmış örnek bir çalışmadır. Yanıtlarınız bu sayfadan ayrıldığınızda kaydedilmez.</p>
  </article>;
}

function WorkbookQuestion({ exercise, number }: { exercise: WorkbookExercise; number: number }) {
  const id = useId();
  const [{ value, checked }, dispatch] = useReducer(workbookAnswerReducer, { value: '', checked: false });
  const field = useRef<HTMLTextAreaElement>(null);
  const feedback = checked ? checkWorkbookAnswer(exercise, value) : null;
  const change = (next: string) => dispatch({ type: 'change', value: next });

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    };
    resize();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return <form className="workbook-question" onSubmit={event => { event.preventDefault(); dispatch({ type: 'check' }); }} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}><span className="workbook-question-number">{number}.</span> {exercise.title}</h3>
    <p id={`${id}-instruction`}>{exercise.instruction}</p>

    {exercise.kind === 'blank' ? <p className="workbook-blank-line">
      <label htmlFor={`${id}-answer`}>{exercise.before}</label>{' '}
      <input id={`${id}-answer`} className="workbook-blank" aria-label={`${number}. alıştırma cevabınız`} aria-describedby={`${id}-instruction`}
        autoComplete="off" type="text" value={value} onChange={event => change(event.target.value)} placeholder="buraya yazın" maxLength={150} />{' '}
      {exercise.after}
    </p> : exercise.kind === 'choice' ? <fieldset className="workbook-choices">
      <legend className="sr-only">{exercise.instruction}</legend>
      {exercise.options.map(option => <label key={option.value}>
        <input type="radio" name={`${id}-choice`} value={option.value} checked={value === option.value} onChange={() => change(option.value)} />
        <span>{option.text}</span>
      </label>)}
    </fieldset> : <textarea ref={field} className="workbook-writing" id={`${id}-answer`} rows={3} value={value}
      aria-label={`${number}. alıştırma cevabınız`} aria-describedby={`${id}-instruction`} placeholder="Düşüncenizi buraya yazın…"
      onChange={event => change(event.target.value)} maxLength={5000} />}

    <button className="workbook-check" type="submit">
      {exercise.kind === 'reflection' ? 'Örnek yanıtla karşılaştır' : 'Kontrol et'}<ArrowRight size={14} aria-hidden="true" />
    </button>
    <div aria-live="polite" aria-atomic="true">
      {feedback ? <div className="workbook-feedback" data-kind={feedback.kind}>
        {feedback.kind === 'compare' ? <>
          <h4>Örnek yanıt</h4><p>{feedback.message}</p>
          {exercise.kind === 'reflection' ? <ul>{exercise.checklist.map(item => <li key={item}>{item}</li>)}</ul> : null}
          <p className="workbook-feedback-note">Bu açık uçlu yanıt otomatik puanlanmaz. Aynı fikri farklı kelimelerle doğru anlatabilirsiniz.</p>
        </> : <>
          <h4>{feedback.kind === 'correct' ? <><Check size={16} aria-hidden="true" /> Doğru</> : feedback.kind === 'retry' ? <><RotateCcw size={15} aria-hidden="true" /> Bir daha düşünün</> : 'Cevabınızı ekleyin'}</h4>
          <p>{feedback.message}</p>
        </>}
      </div> : null}
    </div>
  </form>;
}
