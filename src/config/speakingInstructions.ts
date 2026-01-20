export interface SpeakingInstruction {
  id: string;
  sectionTitle: string;
  instructionText: string;
  audioPath: string;
  sectionNumber: number;
  subPart?: number; // For parts like 1.1, 1.2
}

export const speakingInstructions: SpeakingInstruction[] = [
  {
    id: 'section-1-part-1',
    sectionTitle: 'Birinci Bölüm - Birinci Kısım',
    instructionText: `Bölüm - 1.1

    Merhaba, konuşma bölümüne hoş geldiniz.
Kısa bir bilgilendirmeden sonra başlayacağız.
Şimdi Birinci Bölümün Birinci Kısmına geçiyoruz.
Bu bölümde size kendinizle ilgili 3 kısa soru sorulacaktır.
Her bir soruyu cevaplamak için 30 saniyeniz bulunmaktadır.
Zil sesini duyduğunuzda konuşmaya başlayabilirsiniz.`,
    audioPath: '/1.1.mp3',
    sectionNumber: 1,
    subPart: 1
  },
  {
    id: 'section-1-part-2',
    sectionTitle: 'Birinci Bölüm - İkinci Kısım',
    instructionText: `Bölüm - 1.2

    Şimdi Birinci Bölümün İkinci Kısmına geçiyoruz.
Bu bölümde size 2 resim gösterilecek ve onlara ilişkin daha 3 soru sorulacaktır.
Her bir soruyu cevaplamak için 30 saniyeniz bulunur.
Zil sesini duyduğunuzda konuşmaya başlayabilirsiniz.`,
    audioPath: '/1.2.mp3',
    sectionNumber: 1,
    subPart: 2
  },
  {
    id: 'section-2',
    sectionTitle: 'İkinci Bölüm',
    instructionText: `Bölüm - 2

    Şimdi İkinci Bölüme geçiyoruz.
Bu bölümde size bir resim gösterilecek ve üç soru sorulacaktır.
Konuşmaya başlamadan önce hazırlanmanız için 1 dakikanız,
soruları cevaplamanız için ise 2 dakikanız vardır.
Zil sesinden sonra konuşmaya başlayabilirsiniz.`,
    audioPath: '/2.mp3',
    sectionNumber: 2
  },
  {
    id: 'section-3',
    sectionTitle: 'Üçüncü Bölüm',
    instructionText: `Bölüm - 3

    Şimdi Üçüncü Bölüme geçiyoruz.
    Bu bölümde size bir argüman sunulacaktır.
Bu argümanın her iki yönünü ele alarak konuşmanız gerekmektedir.
Konuşmaya başlamadan önce hazırlanmanız için 1 dakikanız,
konuşmanızı yapmanız için ise 2 dakikanız bulunmaktadır.
Zil sesini duyduktan sonra konuşmaya başlayabilirsiniz.`,
    audioPath: '/3.mp3',
    sectionNumber: 3
  }
];

export const getInstructionForSection = (sectionNumber: number, subPart?: number): SpeakingInstruction | null => {
  if (subPart) {
    return speakingInstructions.find(inst =>
      inst.sectionNumber === sectionNumber && inst.subPart === subPart
    ) || null;
  }

  return speakingInstructions.find(inst =>
    inst.sectionNumber === sectionNumber && !inst.subPart
  ) || null;
};

export const getInstructionById = (id: string): SpeakingInstruction | null => {
  return speakingInstructions.find(inst => inst.id === id) || null;
};
