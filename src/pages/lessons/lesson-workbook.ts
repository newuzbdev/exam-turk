type ExerciseBase = { id: string; title: string; instruction: string };
export type WorkbookExercise = ExerciseBase & (
  | { kind: 'blank'; before: string; after: string; answers: string[]; explanation: string }
  | { kind: 'choice'; options: { value: string; text: string }[]; answer: string; explanation: string }
  | { kind: 'reflection'; exampleAnswer: string; checklist: string[] }
);
export type WorkbookFeedback = { kind: 'empty' | 'correct' | 'retry' | 'compare'; message: string };
export type WorkbookAnswer = { value: string; checked: boolean };
type AnswerAction = { type: 'change'; value: string } | { type: 'check' };

export function workbookAnswerReducer(state: WorkbookAnswer, action: AnswerAction): WorkbookAnswer {
  return action.type === 'change' ? { value: action.value, checked: false } : { ...state, checked: true };
}

const normalizeAnswer = (value: string) => value.normalize('NFC').toLocaleLowerCase('tr-TR').trim().replace(/[.!?]+$/u, '').trim().replace(/\s+/gu, ' ');

export function checkWorkbookAnswer(exercise: WorkbookExercise, value: string): WorkbookFeedback {
  if (!value.trim()) return { kind: 'empty', message: exercise.kind === 'choice' ? 'Önce bir seçenek seçin.' : 'Önce cevabınızı yazın.' };
  if (exercise.kind === 'reflection') return { kind: 'compare', message: exercise.exampleAnswer };
  const correct = exercise.kind === 'choice'
    ? value === exercise.answer
    : exercise.answers.some(answer => normalizeAnswer(answer) === normalizeAnswer(value));
  return { kind: correct ? 'correct' : 'retry', message: exercise.explanation };
}

// Student-facing preview only. No exam grading, saved progress or AI calls.
const listeningWorkbook = {
  title: 'Ana fikri ayrıntıdan ayırın',
  introduction: 'Dinlerken her kelimeyi anlamanız gerekmeyebilir. Önce konuşmacının asıl anlatmak istediğini bulmaya çalışın. İsimler, saatler ve örnekler bu mesajı destekleyen ayrıntılar olabilir.',
  reminder: 'Konuşma ne hakkında? Konuşmacı bu konuda ne anlatmak istiyor?',
  example: 'Mahallemizdeki kütüphane artık akşamları da açık. Geçen hafta iki akşam oraya gittim. Evde dikkatimi toplamakta zorlanıyordum; kütüphanede ise sessiz bir ortam buldum. Böylece derslerime daha rahat çalışabiliyorum.',
  visual: {
    src: '/lesson-media/library-evening-v1.png',
    alt: 'Akşam saatlerinde kütüphanedeki bir masada ders çalışan öğrenci.',
    caption: 'Sessiz bir ortamda ders çalışmak. Temsili görsel.',
    width: 1672, height: 941,
  },
  tip: 'Bir saat, isim ya da sayı duyduğunuzda hemen ana fikir olarak seçmeyin. Bu bilgi yalnızca bir ayrıntı olabilir.',
  rows: [
    { label: 'Konu', text: 'Kütüphanede ders çalışmak.', hint: 'Konuşma ne hakkında?', emphasis: false },
    { label: 'Ana fikir', text: 'Kütüphanenin akşam açık olması, konuşmacının daha rahat çalışmasını sağlıyor.', hint: 'Asıl anlatılmak istenen ne?', emphasis: true },
    { label: 'Ayrıntı', text: 'Geçen hafta kütüphaneye iki akşam gitmiş.', hint: 'Mesajı destekleyen bilgi ne?', emphasis: false },
  ],
  exercises: [
    {
      id: 'main-idea-term', kind: 'blank', title: 'Boşluğu tamamlayın',
      instruction: 'Konuyu ve ana fikri birbirinden ayırın.',
      before: 'Bir konuşmada asıl anlatılmak istenen mesaja', after: 'denir.',
      answers: ['ana fikir'], explanation: 'Ana fikir, konuşmacının vermek istediği temel mesajdır. Ayrıntılar ise bu mesajı destekler.',
    },
    {
      id: 'main-idea-choice', kind: 'choice', title: 'Bütünü anlatan cümleyi bulun',
      instruction: 'Yukarıdaki konuşmanın ana fikrini hangi cümle daha iyi anlatıyor?',
      options: [
        { value: 'visits', text: 'Konuşmacı geçen hafta kütüphaneye iki kez gitmiştir.' },
        { value: 'benefit', text: 'Kütüphanenin akşam açık olması, konuşmacıya uygun bir çalışma ortamı sağlamaktadır.' },
        { value: 'hours', text: 'Mahalledeki kütüphane akşamları da açıktır.' },
      ],
      answer: 'benefit', explanation: 'Konuşmacı yalnızca çalışma saatlerini veya kaç kez gittiğini anlatmıyor. Bu değişikliğin ders çalışmasını nasıl kolaylaştırdığını vurguluyor.',
    },
    {
      id: 'main-idea-own-words', kind: 'reflection', title: 'Şimdi kendi cümlenizle yazın',
      instruction: 'Konuşmanın ana fikrini bir veya iki cümleyle anlatın. Metni aynen kopyalamak yerine kendi kelimelerinizi kullanın.',
      exampleAnswer: 'Kütüphanenin akşam da açık olması, konuşmacının sessiz bir yerde daha rahat ders çalışmasına yardımcı oluyor.',
      checklist: ['Kütüphanenin akşam açık olması ile daha rahat çalışmak arasındaki bağı kurdunuz mu?', 'Tek bir ayrıntıyı değil, konuşmanın temel mesajını anlattınız mı?'],
    },
  ] satisfies WorkbookExercise[],
};

export const getLessonWorkbook = (lessonId: string) => lessonId === 'listening-1' ? listeningWorkbook : undefined;
export type LessonWorkbookContent = typeof listeningWorkbook;
