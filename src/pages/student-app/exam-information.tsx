import * as Tabs from '@radix-ui/react-tabs';
import { useSearchParams } from 'react-router';
import { EXAM_CONTENT_CHECKED_AT, EXAM_COPY, EXAM_SOURCES, examDateLabel, type ExamLanguage } from '@/data/exam-information';
import { ExamCalendar } from './exam-information-calendar';
import { ExamDocuments, ExamScoring, ExamStructure, SourceLink, focus } from './exam-information-sections';
import '../lessons/lesson-catalog.css';
import './exam-information.css';

const sections = ['tarihler', 'yapi', 'puanlama', 'belgeler'] as const;
const sectionLabelIndex = { yapi: 0, puanlama: 1, belgeler: 2, tarihler: 3 } as const;

export default function ExamInformation() {
  const [params, setParams] = useSearchParams();
  const language: ExamLanguage = params.get('dil') === 'uz' ? 'uz' : 'tr';
  const section = sections.find(value => value === params.get('bolum')) ?? 'tarihler';
  const copy = EXAM_COPY[language];
  const update = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set(key, value);
    return next;
  }, { replace: true });

  return <div className="exam-information-page"><div lang={language} className="exam-information">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <h1>{language === 'tr' ? 'Millî CEFR · Türkçe' : 'Milliy CEFR · Turk tili'}</h1>
      <div className="flex gap-1 rounded-[8px] border border-[var(--tm-border-subtle)] bg-white p-1" role="group" aria-label={language === 'tr' ? 'İçerik dili' : 'Ma’lumot tili'}>
        {(['tr', 'uz'] as const).map(value => <button key={value} type="button" lang={value} aria-pressed={language === value} onClick={() => update('dil', value)} className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium ${focus} ${language === value ? 'bg-[#eeede9]' : 'hover:bg-[#f7f7f5]'}`}>{value === 'tr' ? 'Türkçe' : 'O‘zbekcha'}</button>)}
      </div>
    </header>
    <Tabs.Root value={section} onValueChange={value => update('bolum', value)}>
      <Tabs.List className="lesson-category-tabs" aria-label={language === 'tr' ? 'Bilgi bölümleri' : 'Ma’lumot bo‘limlari'}>
        {sections.map(value => <Tabs.Trigger key={value} value={value} className={`lesson-category-tab ${focus}`}>{copy.tabs[sectionLabelIndex[value]]}</Tabs.Trigger>)}
      </Tabs.List>
    <Tabs.Content value={section} className="exam-information-content">
      {section === 'yapi' && <ExamStructure language={language} />}
      {section === 'puanlama' && <ExamScoring language={language} />}
      {section === 'belgeler' && <ExamDocuments language={language} />}
      {section === 'tarihler' && <ExamCalendar language={language} />}
    </Tabs.Content>
    </Tabs.Root>
    <footer className="space-y-3 border-t border-[var(--tm-border-subtle)] pt-5 text-[13px] leading-5">
      <details><summary className={`w-fit cursor-pointer rounded font-medium ${focus}`}>{language === 'tr' ? 'Bilgilendirme' : 'Ma’lumot'}</summary><p className="mt-2 max-w-[850px]">{language === 'tr' ? 'Türkçe ve Özbekçe açıklamalar, resmî belgelerin kısa özetidir; tam çevirisi değildir. Esas kaynak resmî belgelerdir. TurkishMock deneme sonuçları, resmî sınav sonucu veya sertifika değildir.' : 'Turkcha va o‘zbekcha izohlar rasmiy hujjatlarning qisqacha mazmunidir, to‘liq tarjimasi emas. Asosiy manba — rasmiy hujjatlar. TurkishMock sinov natijalari rasmiy imtihon natijasi yoki sertifikat emas.'}</p></details>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><SourceLink href={EXAM_SOURCES.agency}>{copy.agency}</SourceLink>{(section === 'puanlama' || section === 'belgeler') && <SourceLink href={EXAM_SOURCES.catalog}>{copy.catalog}</SourceLink>}{section === 'belgeler' && <><SourceLink href={EXAM_SOURCES.format}>{language === 'tr' ? 'Resmî sınav yapısı' : 'Rasmiy imtihon formati'}</SourceLink><SourceLink href="https://gov.uz/oz/uzbmb/sections/view/49518">{language === 'tr' ? 'Türkçe örnek sınavlar' : 'Turk tili test namunalari'}</SourceLink></>}</div><p>{copy.checked}: <time dateTime={EXAM_CONTENT_CHECKED_AT}>{examDateLabel(EXAM_CONTENT_CHECKED_AT, language)} {EXAM_CONTENT_CHECKED_AT.slice(0, 4)}</time></p></div>
    </footer>
  </div></div>;
}
