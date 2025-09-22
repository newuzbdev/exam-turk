// import {
//   BookOpen,
//   CheckCircle,
//   ChevronLeft,
//   ChevronRight,
//   Clock,
// } from "lucide-react";
// import { Card, CardContent } from "@/components/ui/card";
// import { useEffect, useRef, useState } from "react";

import ReadingPart1 from "./ui/ReadingPart1";

// import { Button } from "@/components/ui/button";
// import {
//   readingSubmissionService,
//   readingTestService,
//   type ReadingTestItem,
// } from "@/services/readingTest.service";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import { useNavigate } from "react-router";
// import HighlightableText from "@/pages/reading-test/components/HighlightableText";

// interface ReadingPageProps {
//   testId?: string;
//   testData?: ReadingTestItem;
// }

// const AUTO_SAVE_KEY = "reading_test_answers_v1";

// const formatTime = (seconds: number) => {
//   const minutes = Math.floor(Math.max(0, seconds) / 60);
//   const rem = Math.max(0, seconds) % 60;
//   return `${minutes}:${rem < 10 ? "0" : ""}${rem}`;
// };

// function getGlobalTokenFromAxios() {
//   try {
//     return (
//       localStorage.getItem("accessToken") ||
//       localStorage.getItem("token") ||
//       undefined
//     );
//   } catch {
//     return undefined;
//   }
// }

// type AnswersState = Record<string, string | string[]>;

// const Q = {
//   MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
//   MULTI_SELECT: "MULTI_SELECT",
//   TEXT_INPUT: "TEXT_INPUT",
//   TRUE_FALSE: "TRUE_FALSE",
//   MATCHING: "MATCHING",
//   FILL_BLANK: "FILL_BLANK",
// } as const;

// function QuestionInput({
//   question,
//   value,
//   onChange,
// }: {
//   question: any;
//   value: string | string[];
//   onChange: (value: string | string[]) => void;
// }) {
//   switch (question.type) {
//     case Q.MULTIPLE_CHOICE:
//       return (
//         <div className="space-y-2">
//           {question.answers?.map((answer: any) => (
//             <label
//               key={answer.id}
//               className="flex items-center gap-2 cursor-pointer"
//             >
//               <input
//                 type="radio"
//                 name={question.id}
//                 value={answer.variantText || ""}
//                 checked={value === answer.variantText}
//                 onChange={(e) => onChange(e.target.value)}
//                 className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
//               />
//               <span className="text-sm text-gray-700">
//                 {answer.variantText}
//               </span>
//             </label>
//           ))}
//         </div>
//       );

//     case Q.TRUE_FALSE:
//       return (
//         <div className="flex gap-4">
//           {["True", "False", "Not Given"].map((option) => (
//             <label
//               key={option}
//               className="flex items-center gap-2 cursor-pointer"
//             >
//               <input
//                 type="radio"
//                 name={question.id}
//                 value={option}
//                 checked={value === option}
//                 onChange={(e) => onChange(e.target.value)}
//                 className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
//               />
//               <span className="text-sm text-gray-700">{option}</span>
//             </label>
//           ))}
//         </div>
//       );

//     case Q.MULTI_SELECT:
//       return (
//         <div className="space-y-2">
//           {question.answers?.map((answer: any) => (
//             <label
//               key={answer.id}
//               className="flex items-center gap-2 cursor-pointer"
//             >
//               <input
//                 type="checkbox"
//                 value={answer.variantText || ""}
//                 checked={
//                   Array.isArray(value) &&
//                   value.includes(answer.variantText || "")
//                 }
//                 onChange={(e) => {
//                   const currentValues = Array.isArray(value) ? value : [];
//                   if (e.target.checked) {
//                     onChange([...currentValues, e.target.value]);
//                   } else {
//                     onChange(currentValues.filter((v) => v !== e.target.value));
//                   }
//                 }}
//                 className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
//               />
//               <span className="text-sm text-gray-700">
//                 {answer.variantText}
//               </span>
//             </label>
//           ))}
//         </div>
//       );

//     case Q.MATCHING:
//       return (
//         <select
//           className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
//           value={(value as string) || ""}
//           onChange={(e) => onChange(e.target.value)}
//         >
//           <option value="">Select an option</option>
//           {question.answers?.map((answer: any) => (
//             <option key={answer.id} value={answer.variantText || ""}>
//               {answer.variantText}
//             </option>
//           ))}
//         </select>
//       );

//     default:
//       return (
//         <input
//           type="text"
//           value={(value as string) || ""}
//           onChange={(e) => onChange(e.target.value)}
//           className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
//           placeholder="Type your answer here..."
//         />
//       );
//   }
// }

// export default function ReadingPage({ testId, testData }: ReadingPageProps) {
//   const navigate = useNavigate();
//   const [test, setTest] = useState<ReadingTestItem | null>(testData || null);
//   const [loading, setLoading] = useState<boolean>(!testData);
//   const [submitting, setSubmitting] = useState<boolean>(false);
//   const [timeRemaining, setTimeRemaining] = useState(60 * 60);
//   const [selectedAnswers, setSelectedAnswers] = useState<AnswersState>({});
//   const [currentPart, setCurrentPart] = useState(0);

//   const abortCtlRef = useRef<AbortController | null>(null);

//   useEffect(() => {
//     document.body.classList.add("exam-mode");
//     const elem = document.documentElement;
//     if (elem.requestFullscreen) {
//       elem.requestFullscreen().catch((err) => {
//         console.warn("Fullscreen ochilmadi:", err);
//       });
//     }

//     return () => {
//       document.body.classList.remove("exam-mode");
//       if (document.fullscreenElement && document.exitFullscreen) {
//         document.exitFullscreen().catch((err) => {
//           console.warn("Fullscreen yopilmadi:", err);
//         });
//       }
//     };
//   }, []);

//   useEffect(() => {
//     const storageKey = `${AUTO_SAVE_KEY}${testId ? `_${testId}` : ""}`;
//     try {
//       const raw = localStorage.getItem(storageKey);
//       if (raw) {
//         const parsed = JSON.parse(raw) as AnswersState;
//         setSelectedAnswers(parsed);
//       }
//     } catch (error) {
//       console.warn("Failed to restore answers:", error);
//     }
//   }, [testId]);

//   useEffect(() => {
//     if (testData) {
//       setTest(testData);
//       setLoading(false);
//       initializeAnswers(testData);
//       return;
//     }

//     if (!testId) {
//       toast.error("Test ID mavjud emas.");
//       setLoading(false);
//       return;
//     }

//     abortCtlRef.current?.abort();
//     const controller = new AbortController();
//     abortCtlRef.current = controller;

//     const fetchTest = async () => {
//       setLoading(true);
//       try {
//         const data = await readingTestService.getTestWithFullData(testId);
//         if (!data) {
//           toast.error("Test ma'lumotlari yuklanmadi.");
//           setTest(null);
//           return;
//         }
//         setTest(data);
//         initializeAnswers(data);
//       } catch (err: any) {
//         if (err?.name !== "CanceledError" && err?.message !== "canceled") {
//           console.error("fetch test error", err);
//           toast.error("Testni yuklashda xatolik yuz berdi.");
//         }
//         setTest(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTest();
//     return () => controller.abort();
//   }, [testId, testData]);

//   const initializeAnswers = (testData: ReadingTestItem) => {
//     const init: AnswersState = {};
//     testData.parts?.forEach((part) => {
//       part.sections?.forEach((section) => {
//         section.questions?.forEach((q) => {
//           if (Object.prototype.hasOwnProperty.call(selectedAnswers, q.id)) {
//             init[q.id] = selectedAnswers[q.id];
//           } else if (q.type === "MULTI_SELECT" || q.type === "MATCHING") {
//             init[q.id] = [];
//           } else {
//             init[q.id] = "";
//           }
//         });
//       });
//     });
//     setSelectedAnswers((prev) => ({ ...init, ...prev }));
//   };

//   useEffect(() => {
//     try {
//       localStorage.setItem(
//         AUTO_SAVE_KEY + (testId ? `_${testId}` : ""),
//         JSON.stringify(selectedAnswers)
//       );
//     } catch {}
//   }, [selectedAnswers, testId]);

//   useEffect(() => {
//     if (loading) return;
//     if (timeRemaining <= 0) {
//       toast.info("Vaqt tugadi — test avtomatik yuboriladi.");
//       void onSubmit();
//       return;
//     }
//     const timer = setTimeout(() => setTimeRemaining((prev) => prev - 1), 1000);
//     return () => clearTimeout(timer);
//   }, [timeRemaining, loading]);

//   useEffect(() => {
//     const handler = (e: BeforeUnloadEvent) => {
//       e.preventDefault();
//       e.returnValue = "";
//     };
//     window.addEventListener("beforeunload", handler);
//     return () => window.removeEventListener("beforeunload", handler);
//   }, []);

//   const handleAnswerSelect = (
//     questionId: string,
//     answer: string | string[]
//   ) => {
//     setSelectedAnswers((prev) => ({
//       ...prev,
//       [questionId]: answer,
//     }));
//   };

//   async function onSubmit() {
//     if (!testId) {
//       toast.error("Test ID mavjud emas. Jo'natilmadi.");
//       return;
//     }
//     if (!test) {
//       toast.error("Test yuklanmagan. Qayta urinib ko'ring.");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload = Object.entries(selectedAnswers).map(
//         ([questionId, val]) => {
//           if (Array.isArray(val))
//             return { questionId, userAnswer: val.join(", ") };
//           return { questionId, userAnswer: (val ?? "") as string };
//         }
//       );

//       const token = getGlobalTokenFromAxios();
//       const response = await readingSubmissionService.submitAnswers(
//         testId,
//         payload,
//         token
//       );

//       toast.success("Javoblaringiz yuborildi. Rahmat!");
//       try {
//         localStorage.removeItem(AUTO_SAVE_KEY + `_${testId}`);
//       } catch {}
//       navigate(`/reading-test/results/${response.testResultId}`);
//       console.log("Test completed, result ID:", response.testResultId);
//     } catch (err: any) {
//       console.error("submit error", err);
//       const msg = err?.message || "Javoblarni yuborishda xatolik yuz berdi.";
//       toast.error(msg);
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="p-8 bg-white rounded-xl shadow-md text-center">
//           <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
//           <div className="text-lg font-medium">Test yuklanmoqda...</div>
//         </div>
//       </div>
//     );
//   }

//   if (!test) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
//         <div className="p-8 bg-white rounded-lg shadow text-center">
//           <h2 className="text-2xl font-bold text-red-600 mb-2">
//             Test topilmadi
//           </h2>
//           <p className="text-gray-700">
//             Test ma'lumotlarini olishda muammo bo'ldi. Iltimos, keyinroq urinib
//             ko'ring.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const currentPartData = test?.parts?.[currentPart];
//   const currentSections = currentPartData?.sections || [];
//   const hasPrev = !!test && currentPart > 0;
//   const hasNext = !!test?.parts && currentPart < (test.parts?.length ?? 0) - 1;

//   const totalQuestions =
//     test.parts?.reduce(
//       (acc, part) =>
//         acc +
//         (part.sections?.reduce(
//           (secAcc, section) => secAcc + (section.questions?.length || 0),
//           0
//         ) || 0),
//       0
//     ) || 0;

//   const answeredQuestions = Object.values(selectedAnswers).filter((answer) =>
//     Array.isArray(answer) ? answer.length > 0 : answer?.toString().trim()
//   ).length;

//   const currentPartQuestions =
//     currentPartData?.sections?.reduce(
//       (acc, section) => acc.concat(section.questions || []),
//       [] as any[]
//     ) || [];

//   return (
//     <div className="min-h-screen bg-gray-50 ">
//       <header className="bg-white border-b-2 border-red-100 px-4 py-4 sticky top-0 z-20 shadow-sm">
//         <div className="flex items-center justify-between max-w-7xl mx-auto">
//           <div className="flex items-center gap-6">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-md">
//                 <BookOpen className="w-5 h-5 text-white" />
//               </div>
//               <div>
//                 <h1 className="font-bold text-lg text-gray-800">
//                   {test?.title || "IELTS Reading Test"}
//                 </h1>
//                 <p className="text-sm text-gray-500">
//                   Part {currentPart + 1} of {test?.parts?.length || 3}
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
//               <Clock className="w-5 h-5 text-red-600" />
//               <div className="text-center">
//                 <div className="font-bold text-xl text-red-600">
//                   {formatTime(timeRemaining)}
//                 </div>
//                 <div className="text-xs text-red-500 font-medium">
//                   minutes remaining
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => {
//                   if (!hasPrev) return;
//                   setCurrentPart((p) => p - 1);
//                   window.scrollTo({ top: 0, behavior: "smooth" });
//                 }}
//                 disabled={!hasPrev}
//                 className="h-8 px-3 disabled:opacity-30"
//               >
//                 <ChevronLeft className="w-4 h-4" />
//                 <span className="hidden sm:inline ml-1">Previous</span>
//               </Button>

//               <div className="flex items-center gap-1 px-2">
//                 {test?.parts?.map((_, index) => (
//                   <button
//                     key={index}
//                     onClick={() => {
//                       setCurrentPart(index);
//                       window.scrollTo({ top: 0, behavior: "smooth" });
//                     }}
//                     className={cn(
//                       "w-8 h-8 rounded-full text-sm font-medium transition-all",
//                       index === currentPart
//                         ? "bg-red-600 text-white shadow-md"
//                         : "bg-white text-gray-600 hover:bg-red-50 border border-gray-200"
//                     )}
//                   >
//                     {index + 1}
//                   </button>
//                 ))}
//               </div>

//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => {
//                   if (!hasNext) return;
//                   setCurrentPart((p) => p + 1);
//                   window.scrollTo({ top: 0, behavior: "smooth" });
//                 }}
//                 disabled={!hasNext}
//                 className="h-8 px-3 disabled:opacity-30"
//               >
//                 <span className="hidden sm:inline mr-1">Next</span>
//                 <ChevronRight className="w-4 h-4" />
//               </Button>
//             </div>
//             <div className="h-8 w-px bg-gray-300"></div>
//             <Button
//               className="bg-red-600 hover:bg-red-700 text-white px-6 h-10 font-medium shadow-md"
//               onClick={onSubmit}
//               disabled={submitting}
//             >
//               {submitting ? (
//                 <>
//                   <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
//                   Submitting
//                 </>
//               ) : (
//                 <>Submit →</>
//               )}
//             </Button>
//           </div>
//         </div>
//       </header>

//       <div className="flex max-w-7xl mx-auto ">
//         <div className="w-1/2 p-6 bg-white border-r-2 border-gray-100 ">
//           <div className="h-[700px] overflow-y-auto pr-4 pb-20 space-y-8">
//             <div className="mb-8">
//               <div className="flex items-center gap-2 mb-3">
//                 <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
//                   PART {currentPart + 1}
//                 </div>
//               </div>
//               <h1 className="text-3xl font-bold text-gray-900 mb-3">
//                 {currentPartData?.title || `READING PASSAGE ${currentPart + 1}`}
//               </h1>
//               {currentPartData?.description && (
//                 <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
//                   <p className="text-sm text-blue-800 leading-relaxed">
//                     {currentPartData.description}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {currentSections.map((section, sectionIndex) => (
//               <div key={section.id || sectionIndex} className="mb-8 ">
//                 <div className="space-y-6">
//                   <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-red-200 pb-2">
//                      {section.title}
//                   </h2>
//                   <div className="text-sm leading-7 text-gray-700 space-y-5">
//                     {section.content?.split("\n\n").map((paragraph, index) => (
//                       <p
//                         key={index}
//                         className="text-justify bg-gray-50 p-4 rounded-lg border-l-4 border-gray-300"
//                       >
//                         <span className="inline-block bg-red-600 text-white w-6 h-6 rounded-full text-center text-xs font-bold mr-3 leading-6">
//                           {String.fromCharCode(65 + index)}
//                         </span>
//                         <HighlightableText text={paragraph} />
                        
//                       </p>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-red-100 shadow-lg z-30">
//             <div className="max-w-7xl mx-auto px-6 py-4">
//               <div className="flex items-center justify-between mb-3">
//                 <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
//                   Question Navigation — Part {currentPart + 1}
//                 </h4>
//                 <span className="text-xs text-gray-500">
//                   Answered: {answeredQuestions}/{totalQuestions}
//                 </span>
//               </div>

//               <div className="flex flex-wrap gap-2">
//                 {currentPartQuestions.map((question, index) => (
//                   <Button
//                     key={question.id}
//                     variant="outline"
//                     size="sm"
//                     onClick={() => {
//                       const qEl = document.getElementById(
//                         `question-${question.id}`
//                       );
//                       if (qEl) {
//                         qEl.scrollIntoView({
//                           behavior: "smooth",
//                           block: "center",
//                         });
//                       }
//                     }}
//                     className={cn(
//                       "w-9 h-9 p-0 text-sm font-medium border-2 transition-all",
//                       selectedAnswers[question.id]
//                         ? "bg-green-100 border-green-500 text-green-700 shadow-sm"
//                         : "border-gray-300 hover:border-red-300 hover:bg-red-50"
//                     )}
//                   >
//                     {index + 1}
//                   </Button>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="w-1/2 p-6 bg-gray-50 overflow-y-auto !h-[740px]">
//           <div className="space-y-8">
//             {currentSections.map((section, sectionIndex) => {
//               if (!section.questions || section.questions.length === 0)
//                 return null;

//               let questionOffset = 0;
//               for (let i = 0; i < sectionIndex; i++) {
//                 questionOffset += currentSections[i]?.questions?.length || 0;
//               }

//               return (
//                 <Card
//                   key={section.id || sectionIndex}
//                   className="border-l-4 border-l-red-500 shadow-md"
//                 >
//                   <CardContent className="p-8">
//                     <div className="flex items-center gap-3 mb-6">
//                       <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold">
//                         Questions {questionOffset + 1}-
//                         {questionOffset + section.questions.length}
//                       </div>
//                     </div>
//                     <div className="space-y-6">
//                       {section.questions.map((question, index) => (
//                         <div
//                           key={question.id}
//                           className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm"
//                         >
//                           <div className="flex items-start gap-4">
//                             <div className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
//                               {questionOffset + index + 1}
//                             </div>
//                             <div className="flex-1">
//                               <p className="text-sm text-gray-700 leading-relaxed mb-3">
//                                 {question.text}
//                               </p>
//                               <QuestionInput
//                                 question={question}
//                                 value={selectedAnswers[question.id] || ""}
//                                 onChange={(value) =>
//                                   handleAnswerSelect(question.id, value)
//                                 }
//                               />
//                               {selectedAnswers[question.id] && (
//                                 <div className="mt-2 text-green-600 flex items-center gap-2 text-sm">
//                                   <CheckCircle className="w-4 h-4" />
//                                   Answer saved
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </CardContent>
//                 </Card>
//               );
//             })}

//             <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-md">
//               <CardContent className="p-6">
//                 <div className="flex items-center justify-between mb-4">
//                   <h4 className="font-semibold text-red-800">Test Progress</h4>
//                   <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
//                     {answeredQuestions} / {totalQuestions}
//                   </span>
//                 </div>
//                 <div className="w-full bg-red-100 rounded-full h-3 mb-2 shadow-inner">
//                   <div
//                     className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 shadow-sm"
//                     style={{
//                       width: `${
//                         totalQuestions > 0
//                           ? (answeredQuestions / totalQuestions) * 100
//                           : 0
//                       }%`,
//                     }}
//                   ></div>
//                 </div>
//                 <p className="text-sm text-red-700 text-center font-medium">
//                   {totalQuestions > 0
//                     ? Math.round((answeredQuestions / totalQuestions) * 100)
//                     : 0}
//                   % Complete
//                 </p>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


export default function ReadingPage() {
  return (
    <div className="ReadingPage">
      <ReadingPart1/>
    </div>
  )
}
