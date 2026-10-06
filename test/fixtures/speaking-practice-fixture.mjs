export const speakingPractice = {
  id: 'speaking-practice-1', title: 'Konuşma pratiği', sectionCode: 'TASK_1_1',
  content: {
    id: 'content-1', title: 'Konuşma pratiği',
    sections: [{
      id: 'section-1', type: 'PART1', order: 1,
      subParts: [{ id: 'task-1', label: 'TASK_1_1', questions: [
        { id: 'question-1', questionText: 'Boş zamanlarınızda neler yaparsınız?', order: 1 },
        { id: 'question-2', questionText: 'Bu etkinliği neden seviyorsunuz?', order: 2 },
      ] }],
    }],
  },
};

export const speakingEvaluation = {
  version: '2.3.0', sectionCode: 'TASK_1_1', evaluated: true, cached: false,
  estimatedLevel: 'B1', sectionScore: 3, maximumScore: 5,
  summary: 'Sorulara ilgili cevaplar verdiniz.', strongPoint: 'Tercihinizi açıkça söylediniz.',
  focusPoint: 'Cevabınızı bir örnekle genişletin.', nextStep: 'Her cevaba bir neden ekleyin.',
  scoreRationale: 'İlgili cevaplarınız anlaşılır, ancak ayrıntı sınırlı.',
  criteria: {
    taskAchievement: 'Soruları yanıtladınız.', fluencyAndCoherence: 'Akışınız anlaşılır.',
    vocabulary: 'Temel kelimeleri kullandınız.', grammar: 'Basit yapılarınız anlaşılır.',
    pronunciationAndIntelligibility: 'Konuşmanız anlaşılır.',
  },
  answers: [],
};
