import { useState } from "react";

interface Question {
  id: number;
  selectedAnswer?: string;
}

interface AnswerOption {
  letter: string;
  text: string;
}

export default function ListeningPart3() {
  const [questions, setQuestions] = useState<Question[]>([
    { id: 15 },
    { id: 16, selectedAnswer: "A" },
    { id: 17, selectedAnswer: "E" },
    { id: 18, selectedAnswer: "C" },
  ]);

  const answerOptions: AnswerOption[] = [
    { letter: "A", text: "Terapi merkezinin tanıtım reklamı verilmiştir" },
    { letter: "B", text: "Manav ürünlerinin fiyatlarında indirim fırsatı" },
    {
      letter: "C",
      text: "Kara yolu seferleri düzenlendiğine dair bilgiler var",
    },
    { letter: "D", text: "İyediklik söz konusudur." },
    {
      letter: "E",
      text: "Kara yolu ulaşım aracıyla ilgili uyarı niteliğindedir",
    },
    { letter: "F", text: "Mesai zamanı belirtilmiştir." },
  ];

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, selectedAnswer: answer } : q
      )
    );
  };

  return (
    <div className="w-full mx-auto bg-white  border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-yellow-50 border-b border-gray-300 px-6 py-4">
        <p className="text-2xl text-gray-700 leading-relaxed">
          Sorular 15-18. Şimdi insanların farklı durumlardaki konuşmalarını
          dinleyeceksiniz. Her konuşma için konuşmaların ait olduğu seçenekleri
          (A-F) işaretleyiniz. Seçenemeniz gerekse İKİ seçenek bulunmaktadır.
        </p>
      </div>

      <div className="flex">
        <div className="w-1/2 p-6 border-r border-gray-300">
          <div className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="flex items-center gap-3">
                <span className="font-bold text-lg">S{question.id}.</span>
                <span className="text-lg">1. konuşmacı ...</span>
                <select
                  value={question.selectedAnswer || ""}
                  onChange={(e) =>
                    handleAnswerSelect(question.id, e.target.value)
                  }
                  className="border border-gray-400 rounded px-2 py-1 text-sm"
                >
                  <option value="">Seç</option>
                  {answerOptions.map((option) => (
                    <option key={option.letter} value={option.letter}>
                      {option.letter}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="w-1/2 p-6">
          <div className="space-y-4">
            {answerOptions.map((option) => (
              <div key={option.letter} className="flex items-start gap-3">
                <div className="text-lg flex items-center justify-center font-bold bg-white">
                  {option.letter})
                </div>
                <p className="text-lg text-gray-700 leading-relaxed flex-1">
                  {option.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
