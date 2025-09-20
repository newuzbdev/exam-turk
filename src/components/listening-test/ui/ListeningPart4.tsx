import img from "./image.png";
import { useState } from "react";

export default function ListeningPart4() {
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({});

  const questions = [
    { id: "19", text: "Spor salonu ...", options: ["Seç"] },
    { id: "20", text: "Gıda mağazası ...", options: ["A"] },
    { id: "21", text: "Eskişehir Oteli ...", options: ["E"] },
    { id: "22", text: "Lokanta ...", options: ["D"] },
    { id: "23", text: "Hayvanat bahçesi ...", options: ["C"] },
  ];

  return (
    <div className="w-full mx-auto bg-white  border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-yellow-50 border-b border-gray-300 px-6 py-4">
        <div className="text-2xl text-gray-700 leading-relaxed">
          4. DINLEME METNİ
        </div>
        <p className="text-2xl text-gray-700 leading-relaxed">
          Dinleme metninde ders hakkında yerler (A-H) işaretlenmiş (19-23).
          Seçenekleri görselde işaretli yerlerle eşleştirin.
        </p>
      </div>
      <div className="flex ">
        <div className="w-1/2 border-r border-gray-300 p-4 ">
          <img src={img} alt="" className="w-[500px] " />
        </div>

        <div className="w-1/2 p-4">
          <div className="flex flex-col justify-center items-start space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="flex items-center gap-3">
                <span className="font-bold text-lg">S{question.id}.</span>
                <span className="text-lg">{question.text}</span>
                <select
                  className="border border-gray-400 rounded px-2 py-1 text-sm"
                  value={selectedAnswers[question.id] || ""}
                  onChange={(e) =>
                    setSelectedAnswers({
                      ...selectedAnswers,
                      [question.id]: e.target.value,
                    })
                  }
                >
                  <option value="">Seç</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                  <option value="H">H</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
