import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MinimalLessonPlayer from './MinimalLessonPlayer';
import WorkbookDocument from './workbook/WorkbookDocument';
import GuidedWorkbook from './workbook/GuidedWorkbook';
import { submitWorkbookExercise, useWorkbookLesson } from './workbook/workbook-api';
import { hasUzbekWorkbook, workbookText } from './workbook/workbook-language';
import './lesson-catalog.css';

export default function LessonVideoPage({ basePath = '/dersler' }: { basePath?: string }) {
  const { previewLessonId } = useParams<{ previewLessonId: string }>();
  const lessonQuery = useWorkbookLesson(previewLessonId);
  const lesson = lessonQuery.data;
  const [searchParams, setSearchParams] = useSearchParams();
  const bilingual = lesson ? hasUzbekWorkbook(lesson) : false;
  const language = bilingual && searchParams.get('dil') === 'uz' ? 'uz' : 'tr';
  const changeLanguage = (value: 'tr' | 'uz') => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    if (value === 'tr') next.delete('dil'); else next.set('dil', value);
    return next;
  }, { replace: true, preventScrollReset: true });
  const returnPath = lesson ? `${basePath}?bolum=${lesson.category}` : basePath;
  return <div className="lesson-catalog lesson-video-page" lang={language}>
    <div className="lesson-detail-toolbar"><Link to={returnPath} className="lesson-back-link"><ArrowLeft size={16} aria-hidden="true" /> {language === 'uz' ? 'Darslarga qaytish' : 'Derslere dön'}</Link>
      {bilingual ? <div className="lesson-language-switch" role="group" aria-label={language === 'uz' ? 'Tushuntirish tili' : 'Anlatım dili'}>
        <button type="button" lang="tr" aria-pressed={language === 'tr'} onClick={() => changeLanguage('tr')}>Türkçe</button>
        <button type="button" lang="uz" aria-pressed={language === 'uz'} onClick={() => changeLanguage('uz')}>O‘zbekcha</button>
      </div> : null}</div>
    {lessonQuery.isPending ? <div className="lesson-detail-state" role="status"><span className="lesson-load-spinner" aria-hidden="true" /><p>Ders yükleniyor…</p></div>
      : lessonQuery.isError || !lesson ? <div className="lesson-detail-state" role="alert"><h1>Ders açılamadı</h1><p>Ders yayından kaldırılmış olabilir veya bağlantınız kesilmiş olabilir.</p><button type="button" className="lesson-text-button" onClick={() => void lessonQuery.refetch()}>Tekrar dene</button></div>
        : <><header className="lesson-catalog-heading lesson-video-heading"><h1>{workbookText(lesson.title, language)}</h1><p>{workbookText(lesson.summary, language)}</p></header>
          {lesson.video ? <MinimalLessonPlayer key={lesson.id} source={lesson.video} title={lesson.title} /> : null}
          {lesson.video && lesson.isDemo ? <div className="lesson-video-note"><p>Bu video oynatıcıyı ve ders akışını denemeniz için eklenmiştir.</p></div> : null}
          <>{lesson.slug === 'writing-2' ? <GuidedWorkbook key={lesson.id} document={lesson} language={language} onSubmit={submitWorkbookExercise} /> : <WorkbookDocument key={lesson.id} document={lesson} language={language} answerMode="student" onSubmit={submitWorkbookExercise} />}</></>}
  </div>;
}
