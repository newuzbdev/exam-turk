"use client";

import { useState } from "react";

interface Question {
  id: string;
  text: string;
  options: {
    label: string;
    text: string;
  }[];
}

interface Section {
  title: string;
  questions: Question[];
}

export default function ListeningPart6() {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({
    S25: "A",
  });

  const sections: Section[] = [
    {
      title: "1. diyalog",
      questions: [
        {
          id: "S30. Dil gelişimi … ",
          text: "Karşılıklı konuşmada, salgınla ilgili hangi çıkarım yapılabilir?",
          options: [
            {
              label: "A",
              text: "Her iki kişi de seyahat kısıtlamaları nedeniyle gelecekle ilgili belirsizlik yaşıyor.",
            },
            {
              label: "B",
              text: "Sadece biri salgından etkileniyor, diğeri seyahatine devam edebilecek.",
            },
            {
              label: "C",
              text: "İkisi de salgının yakın zamanda sona ereceğine inanıyor.",
            },
          ],
        },
        {
          id: "S31. Karşılıklı konuşmada, salgınla ilgili hangi çıkarım yapılabilir?",
          text: "Karşılıklı konuşmada, salgınla ilgili hangi çıkarım yapılabilir?",
          options: [
            {
              label: "A",
              text: "Her iki kişi de seyahat kısıtlamaları nedeniyle gelecekle ilgili belirsizlik yaşıyor.",
            },
            {
              label: "B",
              text: "Sadece biri salgından etkileniyor, diğeri seyahatine devam edebilecek.",
            },
            {
              label: "C",
              text: "İkisi de salgının yakın zamanda sona ereceğine inanıyor.",
            },
          ],
        },
      ],
    },
    {
      title: "2. diyalog",
      questions: [
        {
          id: "S32.Dinçer’in Günay’a karşı tavrı, konuşmanın başından itibaren nasıl şekilleniyor? ",
          text: "Dinçer'in Günay'a karşı tavrı, konuşmanın başından itibaren nasıl şekilleniyor?",
          options: [
            {
              label: "A",
              text: "Her iki kişi de seyahat kısıtlamaları nedeniyle gelecekle ilgili belirsizlik yaşıyor.",
            },
            {
              label: "B",
              text: "Sadece biri salgından etkileniyor, diğeri seyahatine devam edebilecek.",
            },
            {
              label: "C",
              text: "İkisi de salgının yakın zamanda sona ereceğine inanıyor.",
            },
          ],
        },
      ],
    },
  ];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  return (
    <div className="w-full mx-auto bg-white  border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-yellow-50 border-b border-gray-300 px-6 py-4">
        <div className="text-2xl text-gray-700 leading-relaxed">
          6. DINLEME METNİ
        </div>
        <p className="text-2xl text-gray-700 leading-relaxed">
          Sorular 30-35. Dinleme metnine göre doğru seçeneği (A, B ya da C)
          işaretleyiniz.
        </p>
      </div>
      <div className="p-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-8">
            {section.questions.map((question) => (
              <div key={question.id} className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <span className="font-bold text-lg">{question.id}.</span>
                </div>

                <div className="ml-8 space-y-3">
                  {question.options.map((option) => (
                    <div key={option.label} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-lg">
                          {option.label})
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-gray-400 cursor-pointer flex items-center justify-center ${
                            selectedAnswers[question.id] === option.label
                              ? "bg-green-500 border-green-600"
                              : "bg-white"
                          }`}
                          onClick={() =>
                            handleAnswerChange(question.id, option.label)
                          }
                        ></div>
                      </div>
                      <p className="text-lg leading-relaxed flex-1 mt-1">
                        {option.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
