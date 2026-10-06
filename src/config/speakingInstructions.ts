// Speaking_format (1).pdf, page 5: two items from each list, four in total.
export const SPEAKING_PART_3_INSTRUCTION = [
  'Bu bölümde ekranda bir konu ve bu konunun lehinde ve aleyhinde iki liste göreceksiniz.',
  'Her listeden iki madde seçerek konunun her iki yönünü de ele alan dengeli bir konuşma yapın.',
  'Hazırlanmak için bir dakikanız, konuşmak için iki dakikanız vardır.',
  'Zil sesini duyduğunuzda konuşmaya başlayın.',
].join(' ');

export const SPEAKING_PART_3_PRACTICE_INSTRUCTION =
  'Konuyu ve iki listeyi okuyun. Her listeden iki madde seçerek konunun her iki yönünü de ele alan dengeli bir konuşma yapın. Kaydı başlattığınızda iki dakikanız vardır.';

export interface SpeakingInstruction {
  id: string;
  sectionTitle: string;
  instructionText: string;
  audioKey:
    | "audio/speaking-1-1"
    | "audio/speaking-1-2"
    | "audio/speaking-2"
    | "audio/speaking-3";
  sectionNumber: number;
  subPart?: number; // For parts like 1.1, 1.2
}

export const speakingInstructions: SpeakingInstruction[] = [
  {
    id: 'section-1-part-1',
    sectionTitle: 'Bölüm 1.1',
    instructionText: `Bölüm 1.1

Konuşma bölümüne hoş geldiniz.
Bu bölümde size kendinizle ilgili üç kısa soru sorulacaktır.
Her soruyu yanıtlamak için 30 saniyeniz vardır.
Zil sesini duyduğunuzda konuşmaya başlayın.`,
    audioKey: 'audio/speaking-1-1',
    sectionNumber: 1,
    subPart: 1
  },
  {
    id: 'section-1-part-2',
    sectionTitle: 'Bölüm 1.2',
    instructionText: `Bölüm 1.2

Bu bölümde iki görsel gösterilecek ve görsellerle ilgili üç soru sorulacaktır.
Her soruyu yanıtlamak için 30 saniyeniz vardır.
Zil sesini duyduğunuzda konuşmaya başlayın.`,
    audioKey: 'audio/speaking-1-2',
    sectionNumber: 1,
    subPart: 2
  },
  {
    id: 'section-2',
    sectionTitle: 'İkinci Bölüm',
    instructionText: `Bölüm 2

Bu bölümde size bir resim gösterilecek ve üç soru sorulacaktır.
Hazırlanmak için bir dakikanız, üç soruyu yanıtlamak için toplam iki dakikanız vardır.
Zil sesini duyduğunuzda konuşmaya başlayın.`,
    audioKey: 'audio/speaking-2',
    sectionNumber: 2
  },
  {
    id: 'section-3',
    sectionTitle: 'Üçüncü Bölüm',
    instructionText: `Bölüm 3\n\n${SPEAKING_PART_3_INSTRUCTION}`,
    audioKey: 'audio/speaking-3',
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
