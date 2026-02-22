import { useState } from "react";

interface Question {
  id: number;
  text: string;
  selectedAnswer?: "correct" | "incorrect";
}

export default function ListeningPart2() {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 9,
      text: "Vücut tipine uygun bir spor seçmek, kiþinin yaþam boyu spor yapma alýþkanlýðý kazanmasýný kolaylaþtýrabilir.",
      selectedAnswer: "correct",
    },
    {
      id: 12,
      text: "Vücut tipine uygun bir spor seçmek, kiþinin yaþam boyu spor yapma alýþkanlýðý kazanmasýný kolaylaþtýrabilir.",
    },
    {
      id: 10,
      text: "Vücut tipine uygun bir spor seçmek, kiþinin yaþam boyu spor yapma alýþkanlýðý kazanmasýný kolaylaþtýrabilir.",
    },
    {
      id: 13,
      text: "Vücut tipine uygun bir spor seçmek, kiþinin yaþam boyu spor yapma alýþkanlýðý kazanmasýný kolaylaþtýrabilir.",
      selectedAnswer: "correct",
    },
    {
      id: 11,
      text: "Vücut tipine uygun bir spor seçmek, kiþinin yaþam boyu spor yapma alýþkanlýðý kazanmasýný kolaylaþtýrabilir.",
    },
    {
      id: 14,
      text: "Vücut tipine uygun bir spor seçmek, kiþinin yaþam boyu spor yapma alýþkanlýðý kazanmasýný kolaylaþtýrabilir.",
      selectedAnswer: "correct",
    },
  ]);

  const handleAnswerSelect = (
    questionId: number,
    answer: "correct" | "incorrect"
  ) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, selectedAnswer: answer } : q
      )
    );
  };

  return (
    <div className="w-full mx-auto  min-h-screen">
      <div className="bg-yellow-50 border-b border-gray-300 px-6 py-4">
        <p className="text-lg leading-relaxed">
          <strong>Sorular 9-14.</strong> Dinlediðiniz metne göre aþaðýdaki
          cümleler için <strong>DOÐRU</strong> ya da <strong>YANLIÞ</strong>{" "}
          seçeneklerinden birini iþaretleyiniz.
        </p>
        <div className="mt-4 text-lg">
          <p>
            <strong>DOÐRU</strong> - cümle, dinleme metnindeki bilgilerle uyumlu
            ve/veya tutarlýysa
          </p>
          <p>
            <strong>YANLIÞ</strong> - cÃ¼mle, dinleme metnindeki bilgilerle
            tutarsýz ve/veya çeliþkiliyse
          </p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="bg-white  border-gray-300 p-4 rounded"
          >
            <p className="text-lg mb-4 leading-relaxed font-bold">{9 + index}. {question.text}</p>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="font-bold text-lg">A)</span>
                <div className="relative">
                  <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                  {question.selectedAnswer === "correct" && (
                    <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                  )}
                </div>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  className="sr-only"
                  checked={question.selectedAnswer === "correct"}
                  onChange={() => handleAnswerSelect(question.id, "correct")}
                />
                <span className="text-lg text-gray-700 ml-1">Doðru</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="font-bold text-lg">B)</span>

                <div className="relative">
                  <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                  {question.selectedAnswer === "incorrect" && (
                    <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                  )}
                </div>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  className="sr-only"
                  checked={question.selectedAnswer === "incorrect"}
                  onChange={() => handleAnswerSelect(question.id, "incorrect")}
                />
                <span className="text-lg text-gray-700 ml-1">Yanlýþ</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

