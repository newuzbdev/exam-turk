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

export default function ListeningPart5() {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({
    S25: "A", // Pre-selected as shown in the image
  });

  const sections: Section[] = [
    {
      title: "1. diyalog",
      questions: [
        {
          id: "S24",
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
          id: "S25",
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
          id: "S26",
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
          5. DINLEME METNİ
        </div>
        <p className="text-2xl text-gray-700 leading-relaxed">
          Sorular 24-29. Aşağıdaki soruları okuyunuz ve dinleme metinlerine göre
          doğru seçeneği (A, B ya da C) işaretleyiniz.
        </p>
      </div>
      <div className="p-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-8">
            <div className="border-2 border-gray-800 bg-gray-100 px-4 py-2 mb-6">
              <h2 className="font-bold text-lg">{section.title}</h2>
            </div>

            {section.questions.map((question) => (
              <div key={question.id} className="mb-8">
                <div className="mb-4">
                  <p className="font-bold text-lg leading-relaxed">
                    {question.id}. {question.text}
                  </p>
                </div>

                <div className="ml-8 space-y-3">
                  {question.options.map((option) => (
                    <div key={option.label} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-lg">
                          {option.label})
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center cursor-pointer ${
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
