import { useEffect, useState } from "react";

interface Question {
  id: number;
  options: {
    A: string;
    B: string;
    C: string;
  };
  selectedAnswer?: "A" | "B" | "C";
}

export default function ListeningPart1({ questions: externalQuestions }: { questions?: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>([


  ]);

  useEffect(() => {
    if (externalQuestions && externalQuestions.length > 0) {
      setQuestions((prev) => {
        return externalQuestions.map((q) => ({
          id: q.id,
          options: q.options,
          selectedAnswer: prev.find((p) => p.id === q.id)?.selectedAnswer,
        }));
      });
    }
  }, [externalQuestions]);

  const handleAnswerSelect = (questionId: number, answer: "A" | "B" | "C") => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, selectedAnswer: answer } : q))
    );
  };

  return (
    <div className="w-full mx-auto bg-white  border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-yellow-50 border-b border-gray-300 px-6 py-4">
        <p className="text-2xl text-gray-700 leading-relaxed">
          Sorular 1-8. Dinlediğiniz cümleleri tamamlayınız. Cümleleri iki defa
          dinleyeceksiniz. Her cümleye cevap olabilecek en doğru seçeneği (A, B
          veya C) işaretleyiniz.
        </p>
      </div>
      {/* Questions */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {questions.map((question) => (
            <div key={question.id} className="space-y-3">
              <div className="font-bold text-lg">S{question.id}.</div>
              <div className="space-y-2">
                {Object.entries(question.options).map(([letter, text]) => (
                  <label
                    key={letter}
                    className="flex items-start gap-3 p-2 rounded"
                  >
                    <div className="flex items-center justify-center w-5 h-5 mt-0.5">
                      <span className="font-bold mr-2">{`${letter})`}</span>

                      <div className="relative">
                        <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                        {question.selectedAnswer === letter && (
                          <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="text-lg text-gray-700 ml-1">{text}</span>
                    </div>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={letter}
                      checked={question.selectedAnswer === letter}
                      onChange={() =>
                        handleAnswerSelect(
                          question.id,
                          letter as "A" | "B" | "C"
                        )
                      }
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
