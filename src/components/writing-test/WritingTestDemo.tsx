import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import writingTestService, {
  type WritingTestItem,
} from "@/services/writingTest.service";
import writingSubmissionService from "@/services/writingSubmission.service";

interface WritingSubPart {
  id: string;
  label?: string;
  order?: number;
  question?: string;
  description?: string;
  questions?: Array<{
    id: string;
    text?: string;
    sectionId?: string;
    subPartId?: string;
  }>;
}

interface WritingQuestion {
  id: string;
  text?: string;
  question?: string;
  description?: string;
}

interface WritingSection {
  id: string;
  title?: string;
  description?: string;
  order?: number;
  subParts?: WritingSubPart[];
  questions?: WritingQuestion[];
}

interface WritingTestDemoProps {
  testId: string;
}

export default function WritingTestDemo({ testId }: WritingTestDemoProps) {
  const navigate = useNavigate();
  const [, setTest] = useState<WritingTestItem | null>(null);
  const [sections, setSections] = useState<WritingSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Hide navbar and footer during writing test
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("exam-mode");
      return () => {
        document.body.classList.remove("exam-mode");
      };
    }
  }, []);

  // Fetch test data on component mount
  useEffect(() => {
    const load = async () => {
      if (!testId) return;
      setLoading(true);
      try {
        const t = await writingTestService.getById(testId);
        setTest(t);
        // Normalize sections
        const s: WritingSection[] = (t as any)?.sections || [];
        setSections(Array.isArray(s) ? s : []);
        // Set initial timer if instruction contains time info
        if (t?.instruction) {
          const timeMatch = t.instruction.match(/(\d+)\s*minutes?/i);
          if (timeMatch) {
            setTimeLeft(parseInt(timeMatch[1]) * 60);
          }
        }
      } catch (error) {
        toast.error("Test yüklenirken hata oluştu");
        console.error("Error fetching test:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      toast.error("Time is up! Test will be submitted automatically.");
      handleSubmit();
    }
  }, [timeLeft]);

  const selectedSection = sections[currentSectionIndex];
  const subParts = selectedSection?.subParts || [];
  const questions = selectedSection?.questions || [];
  const hasSubParts = subParts.length > 0;
  const hasQuestions = questions.length > 0;
  const selectedSubPart = hasSubParts
    ? subParts[currentSubPartIndex]
    : undefined;
  const selectedQuestion = hasQuestions
    ? questions[currentSubPartIndex]
    : undefined;

  // Always default to 0 for subpart index if not set
  useEffect(() => {
    if (hasSubParts && currentSubPartIndex === undefined) {
      setCurrentSubPartIndex(0);
    }
  }, [hasSubParts, currentSubPartIndex]);

  const selectedQuestionId = useMemo(() => {
    if (hasSubParts && selectedSubPart) {
      return `${currentSectionIndex}-${currentSubPartIndex}-${selectedSubPart.id}`;
    }
    if (hasQuestions && selectedQuestion) {
      return `${currentSectionIndex}-${currentSubPartIndex}-${selectedQuestion.id}`;
    }
    return `${currentSectionIndex}-${selectedSection?.id || "0"}`;
  }, [
    selectedSection?.id,
    selectedSubPart?.id,
    selectedQuestion?.id,
    hasSubParts,
    hasQuestions,
    currentSectionIndex,
    currentSubPartIndex,
  ]);

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [selectedQuestionId]: value,
    }));
  };

  // Textarea ref and custom typing shortcuts like c= -> ç, i= -> ı, I= -> İ, etc.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleShortcutKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    // Only handle when '=' is pressed and selection is collapsed
    if (e.key !== "=") return;

    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) return; // avoid modifying when a range is selected

    const value = el.value;

    const prevIndex = start - 1;
    if (prevIndex < 0) return;

    const prevChar = value[prevIndex];
    const map: Record<string, string> = {
      c: "ç",
      C: "Ç",
      g: "ğ",
      G: "Ğ",
      s: "ş",
      S: "Ş",
      o: "ö",
      O: "Ö",
      u: "ü",
      U: "Ü",
      i: "ı",
      I: "İ",
    };

    const replacement = map[prevChar];
    if (!replacement) return; // Not a shortcut pair -> allow default '='

    // Replace previous char with the mapped one and do not insert '='
    e.preventDefault();
    const newValue = value.slice(0, prevIndex) + replacement + value.slice(end);
    handleAnswerChange(newValue);

    // Restore caret position right after the replaced character
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = prevIndex + 1;
        ta.selectionStart = ta.selectionEnd = pos;
      }
    });
  };

  const insertChar = (ch: string) => {
    const ta = textareaRef.current;
    const value = answers[selectedQuestionId] || "";
    if (!ta) {
      handleAnswerChange(value + ch);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + ch + value.slice(end);
    handleAnswerChange(newValue);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = start + ch.length;
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = pos;
        textareaRef.current.focus();
      }
    });
  };

  const renderKeyboard = () => {
    const upper = ["Ç", "Ğ", "İ", "Ö", "Ş", "Ü", "Â", "Î", "Û"];
    const lower = ["ç", "ğ", "ı", "i", "ö", "ş", "ü", "â", "î", "û"];
    return (
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-semibold">Nasıl Kullanılır:</span> Bilgisayar klavyesiyle doğrudan yazmak için: c=, g=, s= → ç, ğ, ş; o=, u= → ö, ü; i=, I= → ı, İ. Kopyalama → [Ctrl]+[C], Yapıştırma → [Ctrl]+[V].
        </div>
        <div className="flex flex-wrap gap-2">
          {upper.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => insertChar(k)}
              className="border border-gray-300 rounded-md px-3 py-2 text-base text-red-700 bg-white hover:bg-red-50"
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {lower.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => insertChar(k)}
              className="border border-gray-300 rounded-md px-3 py-2 text-base text-red-700 bg-white hover:bg-red-50"
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getWordLimit = () => {
    if (currentSectionIndex === 1) return 300; // Part 2 (Task 2)
    return 200; // Part 1 (Task 1) - both 1.1 and 1.2
  };

  const currentAnswer = answers[selectedQuestionId] || "";
  const wordCount = getWordCount(currentAnswer);
  const wordLimit = getWordLimit();
  const wordsRemaining = Math.max(0, wordLimit - wordCount);
  const isOverLimit = wordCount > wordLimit;

  // Desktop bottom navigation arrows helpers
  const totalItems = (hasSubParts ? subParts.length : questions.length) || 0;
  const goPrev = () => {
    if (totalItems <= 1) return;
    setCurrentSubPartIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };
  const goNext = () => {
    if (totalItems <= 1) return;
    setCurrentSubPartIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
  };

  const handleSubmit = async () => {
    if (!testId) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    // Create proper payload matching API structure
    const payload = {
      writingTestId: testId,
      sections: sections.map((section, sectionIndex) => {
        const sectionData = {
          description:
            section.title ||
            section.description ||
            `Section ${section.order || 1}`,
          answers: [] as any[],
          subParts: [] as any[],
        };

        // Handle sections with subParts
        if (section.subParts && section.subParts.length > 0) {
          sectionData.subParts = section.subParts.map(
            (subPart, subPartIndex) => {
              const questionId = subPart.questions?.[0]?.id || subPart.id;
              const userAnswer =
                answers[`${sectionIndex}-${subPartIndex}-${subPart.id}`] || "";
              return {
                description: subPart.label || subPart.description,
                answers: [
                  {
                    questionId: questionId,
                    userAnswer: userAnswer,
                  },
                ],
              };
            }
          );
        }

        // Handle sections with questions (answers go directly in section)
        if (section.questions && section.questions.length > 0) {
          let questionAnswer = "";
          const possibleKeys = [
            `${sectionIndex}-0-${section.questions[0].id}`,
            `${sectionIndex}-${section.questions[0].id}`,
            `${sectionIndex}-${section.id}`,
            section.questions[0].id,
            section.id,
          ];
          for (const key of possibleKeys) {
            if (answers[key]) {
              questionAnswer = answers[key];
              break;
            }
          }
          if (
            questionAnswer &&
            questionAnswer.includes("Kulübün bir başka üyesi")
          ) {
            questionAnswer = "";
          }
          sectionData.answers = [
            {
              questionId: section.questions[0].id,
              userAnswer: questionAnswer,
            },
          ];
        }

        // Handle sections without subParts or questions (direct answers)
        if (!section.subParts?.length && !section.questions?.length) {
          const sectionAnswer = answers[`${sectionIndex}-${section.id}`] || "";
          if (sectionAnswer.trim()) {
            sectionData.answers = [
              {
                questionId: section.id,
                userAnswer: sectionAnswer,
              },
            ];
          }
        }

        return sectionData;
      }),
    };

    try {
      const res = await writingSubmissionService.create(payload);
      setSubmitting(false);
      if (res) {
        toast.success("Your answers have been saved successfully!");
        navigate(`/writing-test/results/${res.id}`);
      }
    } catch (err: any) {
      setSubmitting(false);
      toast.error(
        "API submission failed, but your answers are saved locally. Please contact support."
      );
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-[999] bg-white px-4 py-3 shadow-sm">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              YAZMA TEST
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-1" />
                <span className="text-base font-semibold">
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="ml-2 text-base text-gray-700 font-semibold">
                {wordCount}/{wordLimit}
              </div>
              <Button
                onClick={() => setShowSubmitModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-base font-semibold"
              >
                Submit
              </Button>
            </div>
          </div>
          {/* Mobile Task Tabs */}
          <div className="mt-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {sections.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSectionIndex(idx)}
                  className={`flex-1 px-4 py-3 rounded-md font-medium text-lg transition-all ${idx === currentSectionIndex
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                    }`}
                >
                  Task {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="mx-12 flex items-center justify-between">
            <div className="flex items-center space-x-10">
              <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">
                TURKISHMOCK
              </div>
            </div>
            <div>
                <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-6 w-6" />
                <span className="font-semibold text-lg">
                  {formatTime(timeLeft)} 
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
            
              <div
                className={`text-lg font-semibold ${isOverLimit ? "text-red-600" : "text-gray-700"
                  }`}
              >
                {wordCount}/{wordLimit}
              </div>
              <Button
                onClick={() => setShowSubmitModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 text-lg font-bold"
              >
                <Send className="h-5 w-5 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 pt-20 lg:pt-20 lg:p-8">
        <div className="max-w-8xl mx-auto">
          {/* Mobile Layout - Questions on top */}
          <div className="lg:hidden space-y-4">
            {/* Questions Panel - Mobile Only */}
            <div className="bg-white rounded-xl shadow-sm p-4 mt-0">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedSection?.title ||
                  `WRITING TASK ${currentSectionIndex + 1}`}
              </h2>
              {selectedSection?.description && (
                <div className="space-y-3 text-gray-700">
                  <p className="text-base">{selectedSection.description}</p>
                  {hasSubParts && selectedSubPart && (
                    <div className="p-3 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-2 text-base">
                        {selectedSubPart.label ||
                          `Part ${currentSubPartIndex + 1}`}
                      </h3>
                      {selectedSubPart.question && (
                        <p className="text-gray-700 text-base">
                          {selectedSubPart.question}
                        </p>
                      )}
                      {selectedSubPart.description && (
                        <p className="text-gray-600 text-xs mt-1">
                          {selectedSubPart.description}
                        </p>
                      )}
                      {selectedSubPart.questions &&
                        selectedSubPart.questions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {selectedSubPart.questions.map((question: any) => (
                              <div
                                key={question.id}
                                className="p-3 bg-gray-100 rounded"
                              >
                                <p className="text-gray-800 font-normal text-base">
                                  {question.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                  {hasQuestions && (
                    <div className="space-y-3">
                      {questions.map((question, idx) => (
                        <div
                          key={question.id}
                          className="p-3 rounded-lg bg-gray-50"
                        >
                          <h3 className="font-medium text-gray-900 mb-2 text-base">
                            Question {idx + 1}
                          </h3>
                          {question.text && (
                            <p className="text-gray-700 text-base">
                              {question.text}
                            </p>
                          )}
                          {question.question && (
                            <p className="text-gray-700 text-base">
                              {question.question}
                            </p>
                          )}
                          {question.description && (
                            <p className="text-gray-600 text-xs mt-1">
                              {question.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Writing Area - Mobile Only */}
            <div className="bg-white rounded-xl shadow-sm p-4 mt-0">
              {(hasSubParts || hasQuestions) &&
                (hasSubParts ? subParts : questions).length > 1 && (
                  <div className="mb-3">
                    <Tabs
                      value={String(currentSubPartIndex)}
                      onValueChange={(value) =>
                        setCurrentSubPartIndex(parseInt(value))
                      }
                      className="w-full"
                    >
                      <TabsList
                        className="flex w-full bg-gray-100 rounded-lg overflow-hidden p-0"
                        style={{
                          boxShadow: "none",
                        }}
                      >
                        {(hasSubParts ? subParts : questions).map((_, idx) => (
                          <TabsTrigger
                            key={idx}
                            value={String(idx)}
                            className={`
                            flex-1 px-0 py-2 text-base font-medium border-none rounded-none
                            transition-all
                            relative
                            ${idx === 0 ? "rounded-l-lg" : ""}
                            ${idx ===
                                (hasSubParts
                                  ? subParts.length - 1
                                  : questions.length - 1)
                                ? "rounded-r-lg"
                                : ""
                              }
                            ${currentSubPartIndex === idx
                                ? "bg-red-500 text-white z-10"
                                : "text-gray-700"
                              }
                          `}
                            style={{
                              background:
                                currentSubPartIndex === idx
                                  ? "#ef4444"
                                  : "none",
                              color:
                                currentSubPartIndex === idx
                                  ? "#fff"
                                  : undefined,
                              boxShadow: "none",
                              minWidth: 0,
                              position: "relative",
                              zIndex: currentSubPartIndex === idx ? 10 : 1,
                            }}
                          >
                            {hasSubParts ? (
                              <span>
                                <span className="">
                                  {currentSectionIndex + 1}
                                </span>
                                <span className="mx-0.5 text-black">.</span>
                                <span className="">{idx + 1}</span>
                              </span>
                            ) : (
                              <span>Q{idx + 1}</span>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                )}
              {renderKeyboard()}
              <textarea
                ref={textareaRef}
                onKeyDown={handleShortcutKeyDown}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type your essay here.."
                className="w-full h-56 p-4 border border-gray-300  resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400 text-base"
                dir="ltr"
                lang="tr"
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-base font-medium text-gray-600">Words Count: {wordCount}</div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Questions left, textarea right, with shadcn resizable */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="w-full">
              <ResizablePanel defaultSize={45} minSize={25} maxSize={60} className="min-w-0 text:red-500">
                <div className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-start h-[calc(100vh-140px)] overflow-y-auto">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    {selectedSection?.title || `WRITING TASK ${currentSectionIndex + 1}`}
                  </h2>
                  {selectedSection?.description && (
                    <div className="space-y-4 text-gray-700">
                      <p className="font-normal text-lg">
                        {selectedSection.description}
                      </p>
                      {hasSubParts && selectedSubPart && (
                        <div className="p-4 rounded-lg bg-gray-50">
                          <h3 className="font-medium text-gray-900 mb-2 text-lg">
                            {selectedSubPart.label || `Part ${currentSubPartIndex + 1}`}
                          </h3>
                          {selectedSubPart.question && (
                            <p className="text-gray-700 text-lg">
                              {selectedSubPart.question}
                            </p>
                          )}
                          {selectedSubPart.description && (
                            <p className="text-gray-600 text-base mt-2">
                              {selectedSubPart.description}
                            </p>
                          )}
                          {selectedSubPart.questions && selectedSubPart.questions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {selectedSubPart.questions.map((question: any) => (
                                <div key={question.id} className="p-3 bg-gray-100 rounded">
                                  <p className="text-gray-800 font-normal text-lg">{question.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {hasQuestions && (
                        <div className="space-y-4">
                          {questions.map((question, idx) => (
                            <div key={question.id} className="p-4 rounded-lg bg-gray-50">
                              <h3 className="font-medium text-gray-900 mb-2 text-lg">Question {idx + 1}</h3>
                              {question.text && <p className="text-gray-700 text-lg">{question.text}</p>}
                              {question.question && <p className="text-gray-700 text-lg">{question.question}</p>}
                              {question.description && (
                                <p className="text-gray-600 text-base mt-2">{question.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="mx-3" />
              <ResizablePanel defaultSize={55} className="min-w-0">
                <div className="bg-white rounded-xl shadow-md p-6 flex-1 min-w-0 h-[calc(100vh-140px)] overflow-y-auto flex flex-col">
                  {(hasSubParts || hasQuestions) && (hasSubParts ? subParts : questions).length > 1 && (
                    <div className="mb-4">
                      <Tabs
                        value={String(currentSubPartIndex)}
                        onValueChange={(value) => setCurrentSubPartIndex(parseInt(value))}
                        className="w-full"
                      >
                        <TabsList
                          className="flex w-full bg-gray-100 rounded-lg overflow-hidden p-0"
                          style={{ boxShadow: "none" }}
                        >
                          {(hasSubParts ? subParts : questions).map((_, idx) => (
                            <TabsTrigger
                              key={idx}
                              value={String(idx)}
                              className={`
                                flex-1 px-0 py-3 text-lg font-medium border-none rounded-none
                                transition-all
                                relative
                                ${idx === 0 ? "rounded-l-lg" : ""}
                                ${idx === (hasSubParts ? subParts.length - 1 : questions.length - 1) ? "rounded-r-lg" : ""}
                                ${currentSubPartIndex === idx ? "bg-red-500 text-white z-10" : "text-gray-700"}
                              `}
                              style={{
                                background: currentSubPartIndex === idx ? "#ef4444" : "none",
                                color: currentSubPartIndex === idx ? "#fff" : undefined,
                                boxShadow: "none",
                                minWidth: 0,
                                position: "relative",
                                zIndex: currentSubPartIndex === idx ? 10 : 1,
                              }}
                            >
                              {hasSubParts ? (
                                <span>
                                  <span className="">{currentSectionIndex + 1}</span>
                                  <span className="mx-0.5 text-gray-200">.</span>
                                  <span className="">{idx + 1}</span>
                                </span>
                              ) : (
                                <span>Q{idx + 1}</span>
                              )}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  )}
                  {renderKeyboard()}

                  <textarea
                    ref={textareaRef}
                    onKeyDown={handleShortcutKeyDown}
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Type your essay here.."
                    className="w-full min-h-[300px] h-auto flex-1 p-6 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400 text-lg"
                    dir="ltr"
                    lang="tr"
                  />

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-lg font-medium text-gray-600">Words Count: {wordCount}</div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            {/* Bottom sticky task switcher - desktop */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full shadow-md px-2 py-1 z-[900]">
              <div className="flex">
                {sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSectionIndex(idx)}
                    className={`px-10 py-3 rounded-full font-medium text-lg transition-all ${idx === currentSectionIndex
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-gray-700 hover:text-red-600 hover:bg-red-50"
                      }`}
                  >
                    Task {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Subpart navigation arrows - desktop */}
            {(hasSubParts || hasQuestions) && (hasSubParts ? subParts.length : questions.length) > 1 && (
              <div className="fixed bottom-4 right-4 z-[900] flex items-center gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="h-10 w-10 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center shadow-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="h-10 w-10 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center shadow-sm"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[9999]  bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Test Gönderiliyor
            </h3>
            <p className="text-gray-600">
              Lütfen bekleyin, testiniz gönderiliyor ve sonuçlar sayfasına
              yönlendiriliyorsunuz...
            </p>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full animate-pulse"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-sm p-6 rounded-2xl">
          {/* Simple Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-black mb-2">Submit Test</h2>
            <p className="text-gray-600 text-base">
              {Object.values(answers).reduce(
                (total, answer) => total + getWordCount(answer),
                0
              )}{" "}
              words • {formatTime(timeLeft)} left
            </p>
          </div>

          {submitting && (
            <div className="text-center py-6 mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-800 font-medium">Test gönderiliyor...</p>
              <p className="text-gray-600 text-base mt-1">
                Lütfen bekleyin, test sonuçlar sayfasına yönlendiriliyorsunuz
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
              disabled={submitting}
              className="flex-1 py-3 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 text-base"
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
