import { type CSSProperties } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { BookOpen, Play } from 'lucide-react';
import { workbookText } from './workbook/workbook-language';
import * as Tabs from '@radix-ui/react-tabs';
import { LESSON_CATEGORIES, getLessonCategory } from './lesson-catalog';
import { LessonCoverArt } from './LessonCoverArt';
import { filterWorkbookLessons } from './workbook/workbook-api-utils';
import { useWorkbookLessons } from './workbook/workbook-api';
import './lesson-catalog.css';

export default function GrammarHome({ basePath = '/dersler' }: { basePath?: string; studentMode?: boolean }) {
  const [params, setParams] = useSearchParams();
  const selected = getLessonCategory(params.get('bolum'));
  const category = LESSON_CATEGORIES.find(item => item.key === selected)!;
  const lessonsQuery = useWorkbookLessons();
  const lessons = filterWorkbookLessons(lessonsQuery.data ?? [], selected);
  const updateSection = (value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set('bolum', value); return next; });
  return <div className="lesson-catalog" lang="tr">
    <header className="lesson-catalog-heading"><h1>Dersler</h1><p>Sınava, bölüm bölüm hazırlanın.</p></header>
    <Tabs.Root value={selected} onValueChange={updateSection} activationMode="automatic">
      <Tabs.List className="lesson-category-tabs" aria-label="Ders bölümleri">{LESSON_CATEGORIES.map(item => <Tabs.Trigger key={item.key} value={item.key} className="lesson-category-tab">{item.label}</Tabs.Trigger>)}</Tabs.List>
      <Tabs.Content value={selected} className="lesson-category-content" style={{ '--lesson-color': category.color, '--lesson-ink': category.ink } as CSSProperties}>
        {lessonsQuery.isPending ? <div className="lesson-load-state" role="status"><span className="lesson-load-spinner" aria-hidden="true" />Dersler yükleniyor…</div>
          : lessonsQuery.isError ? <div className="lesson-load-state lesson-load-error" role="alert"><p>Dersler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p><button type="button" className="lesson-text-button" onClick={() => void lessonsQuery.refetch()}>Tekrar dene</button></div>
            : lessons.length === 0 ? <div className="lesson-load-state lesson-empty-state"><p>Bu bölümde henüz yayımlanmış ders yok.</p><p>Yeni dersler hazır olduğunda burada görünecek.</p></div>
              : <div className="lesson-video-grid">{lessons.map((lesson, index) => <NavLink key={lesson.id} to={`${basePath}/video/${lesson.slug}`} className="lesson-video-card" aria-label={`${workbookText(lesson.title, 'tr')} — dersi aç`}>
                <div className="lesson-card-cover"><LessonCoverArt kind={lesson.cover} /><span className="lesson-card-play">{lesson.video ? <Play size={20} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <BookOpen size={20} aria-hidden="true" />}</span></div>
                <div className="lesson-card-copy"><span className="lesson-card-number">Ders {String(index + 1).padStart(2, '0')}</span><h3>{workbookText(lesson.title, 'tr')}</h3><p>{workbookText(lesson.summary, 'tr')}</p>{lesson.video && lesson.isDemo ? <span className="lesson-demo-label">Örnek video</span> : null}</div>
              </NavLink>)}</div>}
      </Tabs.Content>
    </Tabs.Root>
  </div>;
}
