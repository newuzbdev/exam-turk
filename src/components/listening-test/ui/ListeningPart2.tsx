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
      text: "Vücut tipine uygun bir spor seçmek, kişinin yaşam boyu spor yapma alışkanlığı kazanmasını kolaylaştırabilir.",
      selectedAnswer: "correct",
    },
    {
      id: 12,
      text: "Vücut tipine uygun bir spor seçmek, kişinin yaşam boyu spor yapma alışkanlığı kazanmasını kolaylaştırabilir.",
    },
    {
      id: 10,
      text: "Vücut tipine uygun bir spor seçmek, kişinin yaşam boyu spor yapma alışkanlığı kazanmasını kolaylaştırabilir.",
    },
    {
      id: 13,
      text: "Vücut tipine uygun bir spor seçmek, kişinin yaşam boyu spor yapma alışkanlığı kazanmasını kolaylaştırabilir.",
      selectedAnswer: "correct",
    },
    {
      id: 11,
      text: "Vücut tipine uygun bir spor seçmek, kişinin yaşam boyu spor yapma alışkanlığı kazanmasını kolaylaştırabilir.",
    },
    {
      id: 14,
      text: "Vücut tipine uygun bir spor seçmek, kişinin yaşam boyu spor yapma alışkanlığı kazanmasını kolaylaştırabilir.",
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
          <strong>Sorular 9-14.</strong> Dinlediğiniz metne göre aşağıdaki
          cümleler için <strong>DOĞRU</strong> ya da <strong>YANLIŞ</strong>{" "}
          seçeneklerinden birini işaretleyiniz.
        </p>
        <div className="mt-4 text-lg">
          <p>
            <strong>DOĞRU</strong> – cümle, dinleme metnindeki bilgilerle uyumlu
            ve/veya tutarlıysa
          </p>
          <p>
            <strong>YANLIŞ</strong> – cümle, dinleme metnindeki bilgilerle
            tutarsız ve/veya çelişkiliyse
          </p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {questions.map((question) => (
          <div
            key={question.id}
            className="bg-white  border-gray-300 p-4 rounded"
          >
            <p className="text-lg mb-4 leading-relaxed font-bold">{question.text}</p>

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
                <span className="text-lg text-gray-700 ml-1">Doğru</span>
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
                <span className="text-lg text-gray-700 ml-1">Yanlış</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
