import type { WorkbookBlock, WorkbookDocument } from './types';

export type WorkbookLanguage = 'tr' | 'uz';
// Explicit authoring separator; never infer translations from slashes or newlines.
export const UZBEK_SEPARATOR = '\n\nO‘zbekcha: ';

export function workbookText(value: string, language: WorkbookLanguage): string {
  const index = value.indexOf(UZBEK_SEPARATOR);
  if (index < 0) return value;
  const translation = value.slice(index + UZBEK_SEPARATOR.length).trim();
  return language === 'uz' && translation ? translation : value.slice(0, index).trim();
}

export function hasUzbekWorkbook(document: WorkbookDocument): boolean {
  return document.blocks.some(block => (block.kind === 'text' || block.kind === 'tip') && block.text.includes(UZBEK_SEPARATOR));
}

export function workbookBlockInLanguage(block: WorkbookBlock, language: WorkbookLanguage): WorkbookBlock {
  const text = (value: string) => workbookText(value, language);
  switch (block.kind) {
    case 'heading': case 'text': return { ...block, text: text(block.text) };
    case 'tip': return { ...block, title: text(block.title), text: text(block.text) };
    case 'table': return { ...block, headers: block.headers.map(text), rows: block.rows.map(row => ({ ...row, cells: row.cells.map(text) })) };
    case 'blank': case 'choice': return { ...block, title: text(block.title), instruction: text(block.instruction) };
    case 'reflection': return { ...block, title: text(block.title), instruction: text(block.instruction), checklist: block.checklist.map(text) };
    // Exam sources, sample answers, options and answer keys stay in Turkish.
    default: return block;
  }
}

const uzLabels: Record<string, string> = {
  'Ders anlatımı ve alıştırmalar': 'Dars tushuntirishlari va mashqlar',
  'Bu açık uçlu yanıt otomatik puanlanmaz. Yazdıklarınız bu sayfada kalıcı olarak kaydedilmez.': 'Bu yozma javob avtomatik baholanmaydi. Yozganlaringiz bu sahifada doimiy saqlanmaydi.',
  'Bu açık uçlu yanıt otomatik puanlanmaz. Aynı fikri farklı kelimelerle doğru anlatabilirsiniz.': 'Bu yozma javob avtomatik baholanmaydi. Bir fikrni turli so‘zlar bilan to‘g‘ri ifodalashingiz mumkin.',
  'Kontrol ediliyor…': 'Tekshirilmoqda…', 'Kontrol et': 'Tekshirish',
  'Örnek yanıtla karşılaştır': 'Namunaviy javob bilan solishtirish', 'Örnek yanıt': 'Namunaviy javob',
  'Doğru': 'To‘g‘ri', 'Bir daha düşünün': 'Yana bir bor o‘ylab ko‘ring', 'Cevabınızı ekleyin': 'Javobingizni kiriting',
  'buraya yazın': 'bu yerga yozing', 'Düşüncenizi buraya yazın…': 'Fikringizni turk tilida yozing…',
  'Önce bir seçenek seçin.': 'Avval bir variantni tanlang.', 'Önce cevabınızı yazın.': 'Avval javobingizni yozing.',
  'Bu alıştırma henüz gönderime hazır değil.': 'Bu mashq hali javob yuborishga tayyor emas.',
  'Cevap gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.': 'Javob yuborilmadi. Internet aloqangizni tekshirib, qayta urinib ko‘ring.',
  'Cevabınız doğru.': 'Javobingiz to‘g‘ri.', 'Cevabınızı yeniden düşünün.': 'Javobingiz haqida yana bir bor o‘ylab ko‘ring.',
};
export function workbookLabel(value: string, language: WorkbookLanguage): string {
  return language === 'uz' ? (uzLabels[value] ?? workbookText(value, language)) : workbookText(value, language);
}
