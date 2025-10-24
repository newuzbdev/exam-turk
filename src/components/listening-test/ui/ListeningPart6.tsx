"use client";

import { useState, useEffect } from "react";
import type { ListeningSection, ListeningAnswer } from "@/services/listeningTest.service";

interface Question {
  id: string;
  number: number;
  text: string;
  content: string;
  answers: ListeningAnswer[];
}

interface Section {
  id: string;
  title: string;
  questions: Question[];
}

interface ListeningPart6Props {
  sections?: ListeningSection[];
}

export default function ListeningPart6({ sections: apiSections }: ListeningPart6Props) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});

  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (apiSections && apiSections.length > 0) {
      console.log("ListeningPart6 - API Sections:", apiSections);
      const transformedSections = apiSections.map((section) => ({
        id: section.id,
        title: section.title || "Section",
        questions: (section.questions || []).map((question, index) => {
          console.log("Question data:", question);
          console.log("Question number from API:", question.number);
          const questionNumber = question.number || (30 + index);
          console.log("Final question number:", questionNumber);
          return {
            id: question.id,
            number: questionNumber,
            text: question.text || question.content || "",
            content: question.content || "",
            answers: question.answers || [],
          };
        }),
      }));
      console.log("ListeningPart6 - Transformed Sections:", transformedSections);
      setSections(transformedSections);
    }
  }, [apiSections]);

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
            {section.questions.map((question, index) => (
              <div key={question.id} className="mb-8">
                <div className="mb-4">
                  <p className="font-bold text-lg leading-relaxed">
                    {30 + index}. {question.text}
                  </p>
                  {/* Debug info - remove in production */}
                  <p className="text-xs text-gray-500">
                    Debug: question.number = {question.number}, question.id = {question.id}, typeof number = {typeof question.number}
                  </p>
                  {/* Temporary test - force display question number */}
                  <p className="text-sm text-red-500">
                    TEST: {question.number || 'NO_NUMBER'} - {question.text}
                  </p>
                </div>

                <div className="ml-8 space-y-3">
                  {question.answers.map((answer, index) => {
                    const optionLabel = String.fromCharCode(65 + index); // A, B, C, etc.
                    return (
                      <div key={answer.id} className="flex items-start gap-3">
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-lg">
                            {optionLabel})
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center cursor-pointer ${
                              selectedAnswers[question.id] === optionLabel
                                ? "bg-green-500 border-green-600"
                                : "bg-white"
                            }`}
                            onClick={() =>
                              handleAnswerChange(question.id, optionLabel)
                            }
                          ></div>
                        </div>
                        <p className="text-lg leading-relaxed flex-1 mt-1">
                          {answer.answer}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
