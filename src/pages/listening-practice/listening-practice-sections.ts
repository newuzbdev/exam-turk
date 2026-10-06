export interface ListeningPracticeSection {
  number: number;
  start: number;
  end: number;
  title: string;
  instruction: string;
}

// Soru numaraları ve bölüm türleri gerçek dinleme sınavındaki düzenle aynıdır.
export const listeningPracticeSections: ListeningPracticeSection[] = [
  {
    number: 1,
    start: 1,
    end: 8,
    title: "Cümleyi tamamlama",
    instruction:
      "Sorular 1–8. Dinlediğiniz cümleleri tamamlayınız. Cümleleri iki defa dinleyeceksiniz. Her cümleye cevap olabilecek en doğru seçeneği (A, B veya C) işaretleyiniz.",
  },
  {
    number: 2,
    start: 9,
    end: 14,
    title: "Doğru / Yanlış",
    instruction:
      "Sorular 9–14. Dinlediğiniz metne göre aşağıdaki cümleler için DOĞRU ya da YANLIŞ seçeneklerinden birini işaretleyiniz.",
  },
  {
    number: 3,
    start: 15,
    end: 18,
    title: "Konuşmacı eşleştirme",
    instruction:
      "Sorular 15–18. Konuşmaları dinleyiniz ve her konuşmacıyı uygun seçenekle (A–F) eşleştiriniz. İki seçenek kullanılmayacaktır.",
  },
  {
    number: 4,
    start: 19,
    end: 23,
    title: "Harita eşleştirme",
    instruction:
      "Sorular 19–23. Dinleme metnine göre haritadaki yerleri (A–H) eşleştiriniz. Üç seçenek kullanılmayacaktır.",
  },
  {
    number: 5,
    start: 24,
    end: 29,
    title: "Diyaloglar",
    instruction:
      "Sorular 24–29. Soruları okuyunuz ve dinleme metinlerine göre doğru seçeneği (A, B veya C) işaretleyiniz.",
  },
  {
    number: 6,
    start: 30,
    end: 35,
    title: "Dinleme metni",
    instruction:
      "Sorular 30–35. Dinleme metnine göre doğru seçeneği (A, B veya C) işaretleyiniz.",
  },
];
