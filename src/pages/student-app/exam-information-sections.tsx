import { BookOpen, ChevronDown, Download, ExternalLink, FileText, Headphones, Mic, PenLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { EXAM_COPY, EXAM_DOCUMENTS, EXAM_SOURCES, EXAM_STRUCTURE, type ExamLanguage } from '@/data/exam-information';
import { EXAM_DETAILS, SKILL_NOTES } from '@/data/exam-details';

export const surface = 'rounded-[8px] border border-[var(--tm-border-subtle)] bg-white shadow-[var(--tm-shadow-card)]';
export const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8d87]/50 focus-visible:ring-offset-2';
const colors = ['var(--tm-cat-listening-bg)', 'var(--tm-cat-reading-bg)', 'var(--tm-cat-writing-bg)', 'var(--tm-cat-speaking-bg)'];
const skillIcons = [Headphones, BookOpen, PenLine, Mic];

export function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded text-[13px] font-medium underline decoration-[#c8c7c2] underline-offset-4 ${focus}`}>
    {children}<ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  </a>;
}

export function ExamStructure({ language }: { language: ExamLanguage }) {
  const copy = EXAM_COPY[language];
  return <>
    <p className="max-w-[800px]">{copy.intro}</p>
    <div className="exam-skill-list">
      {EXAM_STRUCTURE.map((skill, index) => {
        const Icon = skillIcons[index];
        const source = index === 0 ? 'https://gov.uz/oz/uzbmb/sections/view/49518' : index === 1 ? EXAM_SOURCES.format : EXAM_DOCUMENTS.find(doc => doc.id === (index === 2 ? 'writing-format' : 'speaking-format'))!.url;
        return <details key={skill.title.tr} className="exam-skill">
          <summary className={`exam-skill-summary ${focus}`}>
            <span className="exam-skill-icon"><Icon size={20} aria-hidden="true" /></span>
            <span className="exam-skill-copy"><span className="exam-skill-title">{skill.title[language]}</span><span className="exam-skill-description">{skill.detail[language]}</span></span>
            <span className="exam-skill-duration">{skill.duration[language]}</span>
            <ChevronDown className="exam-disclosure-arrow" size={16} aria-hidden="true" />
          </summary>
          <div className="exam-skill-body">
            <p>{SKILL_NOTES[index][language]}</p>
              <div className="exam-task-list">
                {EXAM_DETAILS[index].map(task => <article key={task.part} className="exam-task">
                  <span className="exam-task-number">{task.part}</span>
                  <div><div className="exam-task-heading"><h3>{task.title[language]}</h3><p className="exam-task-info">{task.info[language]}</p></div><p>{task.note[language]}</p></div>
                </article>)}
              </div>
            <SourceLink href={source}>{copy.source}</SourceLink>
          </div>
        </details>;
      })}
    </div>
  </>;
}

export function ExamScoring({ language }: { language: ExamLanguage }) {
  const copy = EXAM_COPY[language];
  const tr = language === 'tr';
  const cards = [
    { title: tr ? 'Ham puan nedir?' : 'Birlamchi ball nima?', text: tr ? 'Yazma ve konuşmada cevaplarınıza değerlendirme ölçütlerine göre verilen ilk puandır. Bu puanlar toplanır, sonra ilgili dönüşüm tablosuyla 75 üzerinden sonuca çevrilir.' : 'Yozish va gapirishda javoblaringizga baholash mezonlari asosida beriladigan dastlabki ball. Bu ballar qo‘shilib, tegishli jadval orqali 75 ballik natijaga aylantiriladi.', color: 'var(--tm-cat-goal-bg)', footer: tr ? 'Örneğin yazmada 14/16 ham puan, resmî tabloda 65/75 sınav puanına karşılık gelir.' : 'Masalan, yozishda 14/16 birlamchi ball rasmiy jadvalda 65/75 imtihon balliga mos keladi.' },
    { title: tr ? 'Yazma puanı' : 'Yozish bali', text: tr ? 'Üç görev ayrı değerlendirilir. En fazla 16 ham puan alınır.' : 'Uchta topshiriq alohida baholanadi. Eng ko‘pi 16 birlamchi ball beriladi.', color: colors[2], footer: tr ? 'Görevi yerine getirmeniz, uygun üslup kullanmanız ve düşüncelerinizi anlaşılır bir metinle aktarmanız değerlendirilir.' : 'Topshiriqni bajarish, mos uslubdan foydalanish va fikrlarni tushunarli matnda ifodalash baholanadi.',
      parts: tr ? [['1.1 · Samimi e-posta', '0–5'], ['1.2 · Resmî e-posta', '0–5'], ['2 · Konu üzerine yazı', '0–6']] : [['1.1 · Norasmiy elektron xat', '0–5'], ['1.2 · Rasmiy elektron xat', '0–5'], ['2 · Mavzu bo‘yicha yozma ish', '0–6']],
      criteria: tr ? ['Yönergede istenen konuları ele alma ve yazının amacına uygun üslup.', 'Dil bilgisi, kelime seçimi, yazım ve noktalama.', 'Fikirleri birbirine bağlama ve metni düzenleme. Bu özellikler birlikte değerlendirilir; her hata için sabit bir puan kesilmez.'] : ['Yo‘riqnomadagi talablarni qamrab olish va matn maqsadiga mos uslub.', 'Grammatika, so‘z tanlash, imlo va tinish belgilari.', 'Fikrlarni bog‘lash va matnni tartibli tuzish. Bu xususiyatlar birgalikda baholanadi; har bir xato uchun qat’iy ball ayrilmaydi.'], sourceId: 'writing-rubric' },
    { title: tr ? 'Konuşma puanı' : 'Gapirish bali', text: tr ? 'Birinci bölümün iki kısmı ayrı puanlanır; ikinci ve üçüncü bölümlerin puanları da eklenir. En fazla 21 ham puan alınır.' : 'Birinchi qismning ikkita kichik qismi alohida baholanadi; ikkinchi va uchinchi qismlarning ballari ham qo‘shiladi. Eng ko‘pi 21 birlamchi ball beriladi.', color: colors[3], footer: tr ? 'Sorulara uygun cevap vermeniz ve fikirlerinizi anlaşılır, bağlantılı ve akıcı biçimde anlatmanız değerlendirilir.' : 'Savollarga mos javob berish va fikrlarni tushunarli, bog‘langan hamda ravon ifodalash baholanadi.',
      parts: tr ? [['1.1 · Kişisel sorular', '0–5'], ['1.2 · Görsellerle ilgili sorular', '0–5'], ['2 · Bir konu üzerine konuşma', '0–5'], ['3 · Karşıt görüşleri tartışma', '0–6']] : [['1.1 · Shaxsiy savollar', '0–5'], ['1.2 · Rasmlarga oid savollar', '0–5'], ['2 · Bir mavzu bo‘yicha nutq', '0–5'], ['3 · Qarama-qarshi fikrlar', '0–6']],
      criteria: tr ? ['Soruların istediğini karşılama, düşünceleri açıklama ve gerektiğinde gerekçelendirme.', 'Dil bilgisi, kelime kullanımı ve fikirler arasındaki bağlantılar.', 'Akıcılık ve telaffuzun anlaşılabilirliği. Duraksama ve hataların anlamayı ne kadar etkilediği de dikkate alınır.'] : ['Savol talablarini bajarish, fikrlarni tushuntirish va kerak bo‘lganda asoslash.', 'Grammatika, so‘zlardan foydalanish va fikrlar orasidagi bog‘lanish.', 'Ravonlik va talaffuzning tushunarliligi. To‘xtalishlar va xatolar tushunishga qanchalik ta’sir qilishi ham hisobga olinadi.'], sourceId: 'speaking-rubric' },
    { title: tr ? 'Dinleme ve Okuma' : 'Tinglab tushunish va o‘qish', text: tr ? 'Her beceride 35 soru vardır. Doğru cevap sayınız, puanınız hakkında yaklaşık bir fikir verir.' : 'Har bir ko‘nikmada 35 ta savol bor. To‘g‘ri javoblar soni ballingiz haqida taxminiy tasavvur beradi.', color: colors[1], footer: tr ? 'Aşağıdaki aralıklar dinleme ve okuma için ayrı ayrı geçerlidir; iki bölümün doğru sayıları toplanmaz.' : 'Quyidagi oraliqlar tinglab tushunish va o‘qishga alohida qo‘llanadi; ikki bo‘limning to‘g‘ri javoblari qo‘shilmaydi.', answerRanges: true },
  ];
  return <>
    <section className="exam-level-overview">
      <h2 className="text-[16px] font-semibold">{copy.levels}</h2>
      <p className="mt-2">{tr ? 'Her becerinin sınav puanı 75 üzerinden verilir. Dinleme, okuma, yazma ve konuşma puanlarının ortalaması genel sonucunuzu belirler.' : 'Har bir ko‘nikmaning imtihon balli 75 ballik shkalada beriladi. Tinglab tushunish, o‘qish, yozish va gapirish ballarining o‘rtachasi umumiy natijangizni belgilaydi.'}</p>
      <dl className="exam-score-bands">{[[copy.below, '0–37'], ['B1', '38–50'], ['B2', '51–64'], ['C1', '65–75']].map(([level, score], index) => <div key={level}><dt>{level}</dt><dd>{score}{index === 0 && <small className="exam-certificate-note">{tr ? 'Sertifika verilmez' : 'Sertifikat berilmaydi'}</small>}</dd></div>)}</dl>
    </section>
    <div className="exam-scoring-list">{cards.map(card => <section key={card.title} className="exam-scoring-row">
      <h2><span className="exam-color-dot" style={{ backgroundColor: card.color }} aria-hidden="true"/>{card.title}</h2>
      <div><p className="font-medium">{card.text}</p>
        {card.parts && <dl className="exam-score-parts">{card.parts.map(([label, points]) => <div key={label}><dt>{label}</dt><dd>{points} {tr ? 'puan' : 'ball'}</dd></div>)}</dl>}
        <p className="mt-2">{card.footer}</p>
        {card.sourceId === 'speaking-rubric' && <p className="mt-2 text-[13px]">{tr ? 'Resmî sınavda telaffuz da değerlendirilir. TurkishMock’ta telaffuz değerlendirmesi şu an devre dışıdır.' : 'Rasmiy imtihonda talaffuz ham baholanadi. TurkishMock’da talaffuzni baholash hozircha o‘chirilgan.'}</p>}
        {card.answerRanges && <>
          <table className="exam-answer-ranges">
            <caption>{tr ? 'Doğru cevap sayısı ve yaklaşık puan karşılığı' : 'To‘g‘ri javoblar soni va taxminiy ball'}</caption>
            <thead><tr><th scope="col">{tr ? 'Doğru sayısı' : 'To‘g‘ri javoblar'}</th><th scope="col">{tr ? 'Puan / 75' : 'Ball / 75'}</th><th scope="col">{tr ? 'Düzey' : 'Daraja'}</th></tr></thead>
            <tbody>{[['1–9', '1–37', copy.below], ['10–17', '38–50', 'B1'], ['18–27', '51–64', 'B2'], ['28–35', '65–75', 'C1']].map(([answers, score, level]) => <tr key={level}><td>{answers}</td><td>{score}</td><td>{level}</td></tr>)}</tbody>
          </table>
          <p className="mb-3 text-[13px]">{tr ? 'Tablo, doğru sayınıza göre yaklaşık puan aralığını gösterir.' : 'Jadval to‘g‘ri javoblaringiz soniga qarab taxminiy ball oralig‘ini ko‘rsatadi.'}</p>
          <SourceLink href="/exam-documents/listening-reading-assessment.pdf#page=2">{tr ? 'Resmî yaklaşık karşılık tablosu · sayfa 2' : 'Rasmiy taxminiy moslik jadvali · 2-bet'}</SourceLink>
        </>}
        {card.criteria && <details className="exam-score-criteria"><summary className={focus}>{tr ? 'Değerlendirme ölçütleri' : 'Baholash mezonlari'}</summary>
          <ul>{card.criteria.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="mb-3 text-[13px]">{tr ? 'Bu açıklamalar ölçütlerin kısa özetidir. Puan düzeylerinin tam açıklamaları resmî belgede yer alır.' : 'Bu izohlar mezonlarning qisqacha mazmunidir. Har bir ball darajasining to‘liq tavsifi rasmiy hujjatda berilgan.'}</p>
          <SourceLink href={EXAM_DOCUMENTS.find(doc => doc.id === card.sourceId)!.file}>{tr ? 'Resmî ölçütleri aç' : 'Rasmiy mezonlarni ochish'}</SourceLink>
        </details>}
      </div>
    </section>)}</div>
  </>;
}

export function ExamDocuments({ language }: { language: ExamLanguage }) {
  const copy = EXAM_COPY[language];
  const tr = language === 'tr';
  return <>
    {[
      {prefix:'speaking', title:tr ? 'Konuşma' : 'Gapirish'},
      {prefix:'writing', title:tr ? 'Yazma' : 'Yozish'},
      {prefix:'listening', title:tr ? 'Dinleme ve okuma' : 'Tinglab tushunish va o‘qish'},
    ].map(group => <section key={group.prefix} className="exam-document-group"><h2>{group.title}</h2>
    <div>{EXAM_DOCUMENTS.filter(doc => doc.id.startsWith(group.prefix) && doc.id !== 'speaking-rubric-en').map(doc => <article key={doc.id} className="exam-document-row">
      <FileText className="exam-document-icon" size={18} aria-hidden="true" />
      <div className="exam-document-copy"><h3>{doc.title[language].split(' · ').slice(1).join(' · ')}</h3>
      <p className="mt-1 text-[13px]">{doc.language} · PDF</p>
      {doc.id === 'writing-examples' && <p className="mt-2 text-[13px]">{tr ? 'Yeni görev yapısı, mektup ve yazı örnekleri, değerlendirme açıklamaları.' : 'Yangi topshiriqlar tuzilishi, xat va matn namunalari, baholash izohlari.'}</p>}
      {doc.id === 'speaking-rubric' && <div className="mt-2"><SourceLink href={EXAM_DOCUMENTS.find(item => item.id === 'speaking-rubric-en')!.file}>{tr ? 'İngilizce sürüm · PDF' : 'Inglizcha nusxa · PDF'}</SourceLink></div>}
      {doc.id === 'listening-reading-assessment' && <p className="mb-4 text-[13px]">{tr ? 'Dinleme/okuma ve genel düzey tablosu için referans. Bu belgedeki eski yazma/konuşma tabloları yerine yukarıdaki yeni belgeleri kullanın.' : 'Tinglab tushunish, o‘qish va umumiy daraja uchun manba. Undagi eski yozish/gapirish jadvallari o‘rniga yuqoridagi yangi hujjatlardan foydalaning.'}</p>}
      </div>
      <div className="exam-document-actions">
        <a className={`rounded text-[13px] font-medium underline decoration-[#c8c7c2] underline-offset-4 ${focus}`} href={doc.file} target="_blank" rel="noopener noreferrer" aria-label={`${doc.title[language]}: ${copy.openPdf}`}>{copy.openPdf}</a>
        <a className={`inline-flex items-center gap-1.5 rounded py-1.5 text-[13px] font-medium ${focus}`} href={doc.file} download aria-label={`${doc.title[language]}: ${tr ? 'İndir' : 'Yuklab olish'}`}><Download className="h-3.5 w-3.5" aria-hidden="true" />{tr ? 'İndir' : 'Yuklab olish'}</a>
        {doc.url && <SourceLink href={doc.url}>{copy.source}</SourceLink>}
      </div>
    </article>)}</div></section>)}
  </>;
}
