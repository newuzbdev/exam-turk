import type { LearnCourseSummary } from './learn-types';

export const LESSON_CATEGORIES = [
  { key: 'listening', label: 'Dinleme', color: '#dbeddb', ink: '#587b58', border: '#89a589' },
  { key: 'reading', label: 'Okuma', color: '#d3e5ef', ink: '#527789', border: '#87a6b5' },
  { key: 'writing', label: 'Yazma', color: '#f5e0e9', ink: '#9a607a', border: '#c29aab' },
  { key: 'speaking', label: 'Konuşma', color: '#fdecc8', ink: '#927336', border: '#baa36e' },
  { key: 'grammar', label: 'Gramer', color: '#e8deee', ink: '#80658f', border: '#ab96b8' },
] as const;
export type LessonCategory = typeof LESSON_CATEGORIES[number]['key'];
export type LessonVideoSource = { kind: 'youtube'; id: string } | { kind: 'file'; url: string };
export type LessonCover = 'headphones' | 'notes' | 'choices' | 'conversation' | 'gaps' | 'clock';
export interface PreviewLesson {
  id: string; category: LessonCategory; title: string; description: string;
  cover: LessonCover; preview: true; video: LessonVideoSource;
}

// UI preview only: never inserted into Learn courses or student progress.
// Replace the preview sources with published videos when content is ready.
const previewTopics: Record<LessonCategory, Array<[string, string, LessonCover]>> = {
  listening: [
    ['Dinlerken ana fikri bulma', 'Ayrıntılara takılmadan konuyu anlayın.', 'headphones'],
    ['Anahtar kelimeleri yakalama', 'Cevaba götüren ifadeleri fark edin.', 'notes'],
    ['Seçenekleri eleme', 'Benzer cevaplar arasındaki farkı bulun.', 'choices'],
    ['Konuşmacının amacını anlama', 'Ne söylediği kadar neden söylediğini anlayın.', 'conversation'],
    ['Boşluk doldurma', 'Eksik bilgiyi dinlerken yakalayın.', 'gaps'],
    ['Zamanı doğru kullanma', 'Dinleme öncesini ve sonrasını planlayın.', 'clock'],
  ],
  reading: [
    ['Metnin ana fikrini bulma', 'Metnin ne anlattığını hızlıca belirleyin.', 'notes'],
    ['Doğru bilgiyi bulma', 'Cevabınızı metindeki bilgiyle eşleştirin.', 'choices'],
    ['Boşlukları tamamlama', 'Kelimelerin ve cümlelerin bağını kurun.', 'gaps'],
    ['Başlıkları eşleştirme', 'Her paragrafı uygun başlıkla eşleştirin.', 'notes'],
    ['Yazarın görüşünü anlama', 'Bilgi ve kişisel görüşü ayırt edin.', 'conversation'],
    ['Okuma süresini yönetme', 'Sorulara ve metinlere zaman ayırın.', 'clock'],
  ],
  writing: [
    ['Bölüm 1.1 · Samimi mesaj', 'Yakınınıza uygun bir dille kısa mesaj yazın.', 'conversation'],
    ['Bölüm 1.2 · Resmî mesaj', 'İsteğinizi açık ve uygun bir dille anlatın.', 'notes'],
    ['Bölüm 2 · Görüş yazısı', 'Fikrinizi gerekçe ve örneklerle geliştirin.', 'gaps'],
    ['Yazınızı planlama', 'Yazmaya başlamadan düşüncelerinizi sıralayın.', 'choices'],
    ['Paragrafları bağlama', 'Cümleler arasında doğal geçişler kurun.', 'notes'],
    ['Son kontrol', 'Süre bitmeden yazınızı gözden geçirin.', 'clock'],
  ],
  speaking: [
    ['Bölüm 1.1 · Kendinizi anlatma', 'Kişisel sorulara açık ve doğal cevap verin.', 'conversation'],
    ['Bölüm 1.2 · Görsellerle konuşma', 'Görselleri ve soruyu birlikte ele alın.', 'choices'],
    ['Bölüm 2 · Cevabınızı geliştirme', 'Düşüncenizi gerekçe ve örneklerle anlatın.', 'notes'],
    ['Bölüm 3 · Görüşleri tartışma', 'Farklı görüşleri ele alıp fikrinizi belirtin.', 'conversation'],
    ['Konuşma akışını koruma', 'Düşünceler arasında doğal bağlar kurun.', 'gaps'],
    ['Hazırlık süresini kullanma', 'Kısa notlarla konuşmanızı planlayın.', 'clock'],
  ],
  grammar: [
    ['Cümle kurma', 'Düşüncenizi açık cümlelerle ifade edin.', 'gaps'],
    ['Zamanları doğru kullanma', 'Geçmişi, bugünü ve geleceği anlatın.', 'clock'],
    ['İsim ve hâl ekleri', 'Kelimeler arasındaki ilişkiyi doğru kurun.', 'notes'],
    ['Bağlaçlarla anlatma', 'Neden, sonuç ve karşıtlık ilişkisi kurun.', 'choices'],
    ['Fiilimsiler', 'Cümlelerinizi daha çeşitli hâle getirin.', 'gaps'],
    ['Sık karıştırılan yapılar', 'Benzer yapıların kullanımını ayırt edin.', 'conversation'],
  ],
};
const lessons = LESSON_CATEGORIES.flatMap(({ key }) => previewTopics[key].map(([title, description, cover], index): PreviewLesson => ({
  id: `${key}-${index + 1}`, category: key, title, description, cover,
  preview: true, video: { kind: 'youtube', id: '_yTxZWPMurU' },
})));
export const getLessonCategory = (value: string | null): LessonCategory =>
  LESSON_CATEGORIES.find(category => category.key === value)?.key ?? 'listening';
export const getPreviewLessons = (category: LessonCategory) => lessons.filter(lesson => lesson.category === category);
export const getPreviewLesson = (id: string | undefined) => lessons.find(lesson => lesson.id === id);

export function getCourseCategories(course: Pick<LearnCourseSummary, 'slug' | 'title' | 'description'>): LessonCategory[] {
  const text = `${course.slug} ${course.title} ${course.description ?? ''}`.toLocaleLowerCase('tr-TR');
  const terms: Record<LessonCategory, string[]> = {
    listening: ['dinleme', 'listening'], reading: ['okuma', 'reading'],
    writing: ['yazma', 'writing', 'mektup', 'e-posta'], speaking: ['konuşma', 'konusma', 'speaking'],
    grammar: ['gramer', 'grammar', 'dil bilgisi', 'dilbilgisi'],
  };
  const matched = LESSON_CATEGORIES.filter(({ key }) => terms[key].some(term => text.includes(term))).map(({ key }) => key);
  return matched.length ? matched : ['grammar'];
}
export const clampMediaTime = (seconds: number, duration: number) =>
  Number.isFinite(seconds) && Number.isFinite(duration) ? Math.max(0, Math.min(seconds, duration)) : 0;
export function formatMediaTime(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}:${String(minutes).padStart(2, '0')}` : minutes}:${String(total % 60).padStart(2, '0')}`;
}
