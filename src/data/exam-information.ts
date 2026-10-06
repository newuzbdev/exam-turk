export type ExamLanguage = 'tr' | 'uz';
export type Bilingual = Record<ExamLanguage, string>;
export const EXAM_CONTENT_CHECKED_AT = '2026-09-06';
const monthNames: Record<ExamLanguage, string[]> = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
};
// Some WebKit builds lack Uzbek month names and render "M09" instead.
export function examDateLabel(date: string, language: ExamLanguage) {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${monthNames[language][month - 1]}`;
}
export const EXAM_SOURCES = {
  agency: 'https://gov.uz/oz/uzbmb',
  catalog: 'https://gov.uz/oz/uzbmb/sections/view/49531',
  format: 'https://gov.uz/oz/uzbmb/sections/view/49512',
  calendar: 'https://gov.uz/oz/uzbmb/news/view/210877',
  application: 'https://my.gov.uz',
};

// Curated information only. These values do not configure exam timers or scoring.
export const EXAM_STRUCTURE: { title: Bilingual; detail: Bilingual; duration: Bilingual }[] = [
  { title: { tr: 'Dinleme', uz: 'Tinglab tushunish' }, detail: { tr: '6 bölüm · 35 soru', uz: '6 qism · 35 savol' }, duration: { tr: 'Yaklaşık 45 dakika', uz: 'Taxminan 45 daqiqa' } },
  { title: { tr: 'Okuma', uz: 'O‘qish' }, detail: { tr: '5 bölüm · 35 soru', uz: '5 qism · 35 savol' }, duration: { tr: '60 dakika', uz: '60 daqiqa' } },
  { title: { tr: 'Yazma', uz: 'Yozish' }, detail: { tr: '2 bölüm · 3 görev', uz: '2 qism · 3 topshiriq' }, duration: { tr: '60 dakika', uz: '60 daqiqa' } },
  { title: { tr: 'Konuşma', uz: 'Gapirish' }, detail: { tr: '3 bölüm', uz: '3 qism' }, duration: { tr: 'Yaklaşık 10 dakika', uz: 'Taxminan 10 daqiqa' } },
];

export const WRITING_TASKS = [
  { part: '1.1', tr: 'Tanıdığınız bir kişiye samimi e-posta', uz: 'Tanish kishiga norasmiy elektron xat', length: { tr: 'Yaklaşık 50 kelime', uz: 'Taxminan 50 so‘z' } },
  { part: '1.2', tr: 'Belirtilen kişiye veya kuruma resmî e-posta', uz: 'Ko‘rsatilgan shaxs yoki tashkilotga rasmiy elektron xat', length: { tr: '120–150 kelime', uz: '120–150 so‘z' } },
  { part: '2', tr: 'Verilen konu hakkında görüş, gerekçe ve örnekler içeren metin', uz: 'Berilgan mavzu bo‘yicha fikr, sabab va misollar keltirilgan matn', length: { tr: '180–200 kelime', uz: '180–200 so‘z' } },
];
export const SPEAKING_TASKS = [
  { part: '1.1', tr: 'Tanıdık konularda 3 soruya cevap', uz: 'Tanish mavzularda 3 savolga javob', time: { tr: 'Her soru 30 sn · hazırlık yok', uz: 'Har bir savol 30 soniya · tayyorgarliksiz' } },
  { part: '1.2', tr: 'İki ortak görsel etrafında 3 soru', uz: 'Ikkita umumiy rasm asosida 3 savol', time: { tr: '45 sn / 30 sn / 30 sn · hazırlık yok', uz: '45 / 30 / 30 soniya · tayyorgarliksiz' } },
  { part: '2', tr: 'Bir konuya bağlı 3 soruyu tek konuşmada ele alma', uz: 'Bir mavzuga oid 3 savolni bitta nutqda yoritish', time: { tr: '1 dk hazırlık · 2 dk cevap', uz: '1 daqiqa tayyorgarlik · 2 daqiqa javob' } },
  { part: '3', tr: 'Bir konunun lehindeki ve aleyhindeki görüşleri tartışma', uz: 'Bir mavzu bo‘yicha yoqlovchi va qarshi fikrlarni muhokama qilish', time: { tr: '1 dk hazırlık · 2 dk cevap', uz: '1 daqiqa tayyorgarlik · 2 daqiqa javob' } },
];

export const EXAM_DOCUMENTS: { id: string; title: Bilingual; language: string; url: string; file: string }[] = [
  { id: 'speaking-turkish-sample', title: { tr: 'Konuşma · Türkçe örnek sınav', uz: 'Gapirish · turk tili namunaviy testi' }, language: 'Türkçe', url: '' },
  { id: 'listening-reading-turkish-sample', title: { tr: 'Dinleme ve Okuma · Türkçe örnek sınav', uz: 'Tinglab tushunish va o‘qish · turk tili namunaviy testi' }, language: 'Türkçe', url: '' },
  { id: 'writing-examples', title: { tr: 'Yeni yazma · açıklamalar ve örnek cevaplar', uz: 'Yangi yozish · izohlar va namunaviy javoblar' }, language: 'Türkçe / O‘zbekcha', url: '' },
  { id: 'speaking-format', title: { tr: 'Konuşma · sınav yapısı ve örnekler', uz: 'Gapirish · imtihon tuzilishi va namunalar' }, language: 'O‘zbekcha', url: 'https://uzbmb.uz/upload/file/pdf/phone/Speaking_format.pdf' },
  { id: 'speaking-rubric', title: { tr: 'Konuşma · değerlendirme ölçütleri', uz: 'Gapirish · baholash mezonlari' }, language: 'O‘zbekcha / Русский', url: 'https://uzbmb.uz/upload/file/pdf/phone/yangi_format_uzbek_rus.pdf' },
  { id: 'speaking-rubric-en', title: { tr: 'Konuşma · değerlendirme ölçütleri (İngilizce)', uz: 'Gapirish · baholash mezonlari (inglizcha)' }, language: 'English', url: 'https://uzbmb.uz/upload/file/pdf/phone/yangi_format_eng.pdf' },
  { id: 'speaking-scale', title: { tr: 'Konuşma · puan dönüşüm tablosu', uz: 'Gapirish · ballarni o‘girish jadvali' }, language: 'O‘zbekcha', url: 'https://uzbmb.uz/upload/file/pdf/phone/reyting_shkala.pdf' },
  { id: 'writing-format', title: { tr: 'Yazma · yeni sınav yapısı ve puan tablosu', uz: 'Yozish · yangi imtihon tuzilishi va ballar jadvali' }, language: 'O‘zbekcha', url: 'https://api-portal.gov.uz/uploads/165/2025/10/13/99dfbb36-0f1d-2c70-8a4e-e1382a5f255b_media_.pdf' },
  { id: 'writing-rubric', title: { tr: 'Yazma · yeni değerlendirme ölçütleri', uz: 'Yozish · yangi baholash mezonlari' }, language: 'O‘zbekcha', url: 'https://api-portal.gov.uz/uploads/165/2025/10/13/b260e792-2fc6-630d-5bfe-399a2a0e55b6_media_.pdf' },
  { id: 'listening-reading-assessment', title: { tr: 'Dinleme ve okuma · değerlendirme esasları', uz: 'Tinglab tushunish va o‘qish · baholash asoslari' }, language: 'O‘zbekcha', url: 'https://api-portal.gov.uz/uploads/165/2026/01/26/529855da-9421-d2ef-9021-7a6d28900b08_media_.pdf' },
].map(doc => ({ ...doc, file: `/exam-documents/${doc.id}.pdf` }));

export type ExamSession = { id: string; examStart: string; examEnd: string; registrationStart: string; registrationEnd: string; paymentEnd: string; sourceUrl: string; published: boolean; version: number };
export function registrationStatus(session: ExamSession, today: string) {
  if (today > session.examEnd) return 'past';
  if (today < session.registrationStart) return 'upcoming';
  return today <= session.registrationEnd ? 'open' : 'closed';
}

export const EXAM_COPY = {
  tr: {
    title: 'Sınav Bilgileri', subtitle: 'Özbekistan Türkçe Multilevel sınavı',
    tabs: ['Sınav yapısı', 'Puanlama', 'Belgeler', 'Tarihler'],
    intro: 'Özbekistan’da uygulanan bu sınav dinleme, okuma, yazma ve konuşma becerilerinizi ölçer. B1, B2 ve C1 için ayrı sınavlara girmeniz gerekmez; seviyeniz aldığınız puana göre belirlenir.',
    summary: 'TurkishMock açıklaması', disclaimer: 'Bu sayfa bilgi amaçlıdır; resmî kurumun yerine geçmez. Türkçe ve Özbekçe açıklamalarımız belgelerin özetidir, tam çevirisi değildir. Esas kaynak resmî belgelerdir.',
    source: 'Resmî kaynak', checked: 'Son kontrol', agency: 'Resmî kurumun sitesi',
    writing: 'Yazma görevleri', speaking: 'Konuşma bölümleri',
    taskNote: 'Her görevde verilen yönergeyi esas alın. Yazma için 60 dakika toplam süredir.',
    scoringTitle: 'Puanınız nasıl oluşur?',
    scoring: 'Ham puan, bölümlerde aldığınız ilk puanların toplamıdır. Bu toplam, resmî dönüşüm tablosuyla 75 üzerinden sınav puanına çevrilir. Örneğin 16 üzerinden bir ham puan ile 75 üzerinden bir sonuç aynı ölçek değildir.',
    writingScore: 'Yazma: 5 + 5 + 6 = en fazla 16 ham puan.',
    speakingScore: 'Konuşma: 5 + 5 + 5 + 6 = en fazla 21 ham puan.',
    scoreNote: 'Dinleme ve okumada resmî sınav, soru güçlüğünü dikkate alan bir hesaplama (Rasch yöntemi) kullanır. Yalnız doğru cevap sayısıyla kesin resmî puan hesaplanamaz. Genel sonuç dört becerinin puan ortalamasıdır.',
    levels: 'Genel sonuç ve düzey', level: 'Düzey', score: 'Puan aralığı', below: 'B1 altı',
    platformNote: 'TurkishMock sonuçları deneme sınavı değerlendirmesidir; resmî sonuç veya sertifika değildir. Resmî konuşma ölçütlerinde telaffuz bulunur. Platformdaki telaffuz değerlendirmesi şu an devre dışıdır.',
    documents: 'Resmî belgeler', documentsNote: 'Yeni yazma ve konuşma formatına ait orijinal belgeler. PDF bağlantısı açılmazsa resmî belge listesini kullanabilirsiniz.',
    catalog: 'Resmî belge listesi', openPdf: 'PDF’yi aç', original: 'Orijinal belge',
    dates: 'Türkçe sınav tarihleri', period: '2026 · Ağustos–Aralık',
    calendarNote: '26 Ağustos 2026 tarihli resmî duyurudan alınmıştır. Tarihler değişebilir; kontenjan dolarsa başvuru daha erken kapanabilir. Kendi sınav gününüzü ve konuşma oturumunuzu giriş belgenizden kontrol edin.',
    registration: 'Başvuru', payment: 'Son ödeme', calendar: 'Resmî takvimi aç', apply: 'Başvuru sitesi',
    statuses: { upcoming: 'Başvuru başlayacak', open: 'Takvime göre başvuru dönemi', closed: 'Başvuru süresi bitti', past: 'Geçmiş oturum' },
    dateNote: 'Kalan günler ve durumlar Özbekistan saatine göre otomatik değişir. Yeni sınav tarihleri resmî duyurular kontrol edilerek eklenir. Kesin saatler ve özel düzenlemeler için resmî duyuruya bakın.',
  },
  uz: {
    title: 'Imtihon ma’lumotlari', subtitle: 'O‘zbekistondagi turk tili Multilevel imtihoni',
    tabs: ['Imtihon tuzilishi', 'Baholash', 'Hujjatlar', 'Sanalar'],
    intro: 'O‘zbekistonda o‘tkaziladigan ushbu imtihon tinglab tushunish, o‘qish, yozish va gapirish ko‘nikmalaringizni baholaydi. B1, B2 va C1 uchun alohida imtihon topshirishingiz shart emas; darajangiz olgan ballingizga qarab aniqlanadi.',
    summary: 'TurkishMock izohi', disclaimer: 'Bu sahifa ma’lumot berish uchun tayyorlangan; rasmiy tashkilot o‘rnini bosmaydi. Turkcha va o‘zbekcha izohlarimiz hujjatlarning qisqacha mazmunidir, to‘liq tarjimasi emas. Asosiy manba — rasmiy hujjatlar.',
    source: 'Rasmiy manba', checked: 'Oxirgi tekshiruv', agency: 'Rasmiy tashkilot sayti',
    writing: 'Yozish topshiriqlari', speaking: 'Gapirish qismlari',
    taskNote: 'Har bir topshiriqda berilgan yo‘riqnomaga amal qiling. Yozish uchun jami 60 daqiqa ajratiladi.',
    scoringTitle: 'Balingiz qanday hisoblanadi?',
    scoring: 'Birlamchi ball — qismlarda olgan dastlabki ballaringiz yig‘indisi. Bu yig‘indi rasmiy jadval orqali 75 ballik natijaga aylantiriladi. Masalan, 16 ballik shkaladagi birlamchi ball bilan 75 ballik natija bir xil o‘lchov emas.',
    writingScore: 'Yozish: 5 + 5 + 6 = eng ko‘pi 16 birlamchi ball.',
    speakingScore: 'Gapirish: 5 + 5 + 5 + 6 = eng ko‘pi 21 birlamchi ball.',
    scoreNote: 'Rasmiy imtihonda tinglab tushunish va o‘qish savollarning qiyinligini hisobga oladigan Rasch usuli bilan baholanadi. Faqat to‘g‘ri javoblar sonidan aniq rasmiy ballni hisoblab bo‘lmaydi. Umumiy natija to‘rtta ko‘nikma ballarining o‘rtachasidir.',
    levels: 'Umumiy natija va daraja', level: 'Daraja', score: 'Ball oralig‘i', below: 'B1 dan quyi',
    platformNote: 'TurkishMock natijalari sinov imtihoni bahosidir; rasmiy natija yoki sertifikat emas. Rasmiy gapirish mezonlarida talaffuz ham bor. Platformada talaffuzni baholash hozircha o‘chirilgan.',
    documents: 'Rasmiy hujjatlar', documentsNote: 'Yangi yozish va gapirish formatiga oid asl hujjatlar. PDF havolasi ochilmasa, rasmiy hujjatlar ro‘yxatidan foydalanishingiz mumkin.',
    catalog: 'Rasmiy hujjatlar ro‘yxati', openPdf: 'PDFni ochish', original: 'Asl hujjat',
    dates: 'Turk tili imtihon sanalari', period: '2026 · Avgust–dekabr',
    calendarNote: '2026-yil 26-avgustdagi rasmiy e’londan olingan. Sanalar o‘zgarishi mumkin; o‘rinlar to‘lsa, ro‘yxatdan o‘tish ertaroq yopilishi mumkin. O‘zingizning imtihon kuningiz va gapirish sessiyangizni ruxsatnomadan tekshiring.',
    registration: 'Ro‘yxatdan o‘tish', payment: 'To‘lovning oxirgi kuni', calendar: 'Rasmiy taqvimni ochish', apply: 'Ariza topshirish sayti',
    statuses: { upcoming: 'Ro‘yxatdan o‘tish boshlanadi', open: 'Taqvim bo‘yicha ro‘yxatdan o‘tish davri', closed: 'Ro‘yxatdan o‘tish muddati tugagan', past: 'O‘tgan sessiya' },
    dateNote: 'Qolgan kunlar va holatlar O‘zbekiston vaqti bo‘yicha avtomatik o‘zgaradi. Yangi sanalar rasmiy e’lonlar tekshirilgach qo‘shiladi. Aniq vaqtlar va maxsus shartlar uchun rasmiy e’lonni tekshiring.',
  },
};
