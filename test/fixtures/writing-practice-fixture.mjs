export const writingAnswer = 'Merhaba arkadaşım\nDün okul gittim ve kitap okudum. Havo iyi idi ama ben biraz yoruldum';
const doc = text => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
export const writingPractice = {
  id: 'practice-1', title: 'Arkadaşınıza mektup', estimatedMinutes: 20, sectionCode: 'TASK_1_1', isFreeAccess: true,
  content: {
    id: 'content-1', title: 'Arkadaşınıza mektup', formatVersion: 2, durationMinutes: 60,
    instruction: 'Arkadaşınızdan gelen e-postayı okuyun ve cevap yazın.', sourceEmail: doc('Merhaba! Dün günün nasıl geçti? Neler yaptığını anlatır mısın?'),
    sections: [{ id: 'section-1', partCode: 'PART_1', order: 1, title: 'Bölüm 1', subParts: [{
      id: 'task-1', taskCode: 'TASK_1_1', label: '1.1', order: 1, register: 'Gayriresmî', genre: 'Mektup', targetLevel: 'B1', wordMin: 50, wordMax: 50,
      promptJson: doc('Arkadaşınıza bir mektup yazın. Gününüzü anlatın ve ona bir soru sorun.'), questions: [{ id: 'question-1', text: '' }],
    }] }],
  },
};
export const writingEvaluation = {
  version: '1.1.1', answerText: writingAnswer, wordCount: 15, evaluated: true, cached: false,
  summary: 'Gününüzü anlatan anlaşılır bir başlangıç yaptınız. Metni tamamlayıp dil hatalarını düzeltin.',
  strongPoint: 'Yaptığınız iki etkinliği belirttiniz.', focusPoint: 'Yer bildiren ekleri ve Türkçe kelime seçimini gözden geçirin.',
  taskStatus: 'PARTLY_MET', taskFeedback: 'Gününüzü anlattınız; arkadaşınıza soracağınız soru ve mektubun kapanışı eksik.',
  estimatedLevel: 'A2', levelReason: 'Basit cümlelerle etkinliklerinizi anlatıyorsunuz; “okul gittim” gibi ek hataları ve sınırlı kelime kullanımı görülüyor.',
  criteria: {
    grammar: 'Basit geçmiş zaman yapıları anlaşılır. “Okul gittim” ifadesinde yönelme eki eksik.',
    vocabulary: 'Günlük etkinlikleri anlatan kelimeler var; “Havo” yerine Türkçe “hava” kullanılmalı.',
    coherence: 'Etkinlikleri “ve” ile, karşıtlığı “ama” ile bağlıyorsunuz. Mektubun kapanışı eksik.',
    register: '“Merhaba arkadaşım” hitabı gayriresmî mektuba uygun.',
    spellingAndPunctuation: 'Selamlamadan sonra noktalama ve metnin sonunda nokta eksik.',
  },
  wordTargetFeedback: '15 kelime yazdınız. Hedef 50 kelime; en az 35 kelime daha yazın.',
  nextStep: 'Bir soru ve kısa bir kapanış ekleyerek yaklaşık 50 kelimelik bir mektup oluşturun.',
  corrections: [
    { start: writingAnswer.indexOf('okul'), end: writingAnswer.indexOf('okul') + 4, original: 'okul', corrected: 'okula', explanation: 'Gitmek fiilinde gidilen yer yönelme eki alır.', kind: 'GRAMMAR' },
    { start: writingAnswer.indexOf('Havo'), end: writingAnswer.indexOf('Havo') + 4, original: 'Havo', corrected: 'Hava', explanation: 'Bu kelimenin Türkçe yazımı hava şeklindedir.', kind: 'VOCABULARY' },
  ],
};
