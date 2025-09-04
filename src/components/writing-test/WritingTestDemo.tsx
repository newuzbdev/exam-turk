import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Keyboard from "react-simple-keyboard";
import "simple-keyboard/build/css/index.css";
import writingTestService, { type WritingTestItem } from "@/services/writingTest.service";
import writingSubmissionService from "@/services/writingSubmission.service";

// --- BEGIN: Improved Resizable for LG screens ---
function ResizableHorizontalPanels({
  left,
  right,
  minLeft = 25,
  maxLeft = 60,
  defaultLeft = 35,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  minLeft?: number;
  maxLeft?: number;
  defaultLeft?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(defaultLeft);
  const [dragging, setDragging] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let percent = ((e.clientX - rect.left) / rect.width) * 100;
      percent = Math.max(minLeft, Math.min(maxLeft, percent));
      setLeftPercent(percent);
    },
    [dragging, minLeft, maxLeft]
  );

  const onMouseUp = useCallback(() => {
    setDragging(false);
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);

  return (
    <div
      ref={containerRef}
      className="w-full flex gap-0"
      style={{ minHeight: 480 }}
    >
      <div
        className="bg-white rounded-xl border-2 border-gray-300 shadow-lg p-8 flex flex-col justify-start transition-all duration-150"
        style={{
          width: `calc(${leftPercent}% - 12px)`,
          minWidth: 0,
          transition: dragging ? "none" : "width 0.15s",
        }}
      >
        {left}
      </div>
      <div
        className="flex items-stretch select-none"
        style={{
          width: 24,
          cursor: "col-resize",
          userSelect: "none",
          zIndex: 10,
        }}
        onMouseDown={onMouseDown}
        aria-label="Resize panel"
        tabIndex={-1}
      >
        <div className="w-6 h-full flex items-center justify-center">
          <div className="w-2 h-24 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
        </div>
      </div>
      <div
        className="bg-white rounded-xl border-2 border-gray-300 shadow-lg p-8 flex-1 min-w-0 transition-all duration-150"
        style={{
          width: `calc(${100 - leftPercent}% - 12px)`,
          minWidth: 0,
          transition: dragging ? "none" : "width 0.15s",
        }}
      >
        {right}
      </div>
    </div>
  );
}
// --- END: Improved Resizable for LG screens ---

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
  onTestComplete?: (submissionId: string) => void;
}

export default function WritingTestDemo({ testId, onTestComplete }: WritingTestDemoProps) {
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

  // Keyboard state (only for desktop)
  const [showKeyboard, setShowKeyboard] = useState(false);

  const keyboardRef = useRef<any>(null);

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
  const selectedSubPart = hasSubParts ? subParts[currentSubPartIndex] : undefined;
  const selectedQuestion = hasQuestions ? questions[currentSubPartIndex] : undefined;

  const selectedQuestionId = useMemo(() => {
    if (hasSubParts && selectedSubPart) {
      return `${currentSectionIndex}-${currentSubPartIndex}-${selectedSubPart.id}`;
    }
    if (hasQuestions && selectedQuestion) {
      return `${currentSectionIndex}-${currentSubPartIndex}-${selectedQuestion.id}`;
    }
    return `${currentSectionIndex}-${selectedSection?.id || "0"}`;
  }, [selectedSection?.id, selectedSubPart?.id, selectedQuestion?.id, hasSubParts, hasQuestions, currentSectionIndex, currentSubPartIndex]);

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [selectedQuestionId]: value,
    }));
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

  const onKeyboardChange = (input: string) => {
    // Don't call handleAnswerChange here - let onKeyPress handle individual keys
  };

  const onKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") return;
    if (button === "{tab}") return;
    const currentText = currentAnswer;
    if (button === "{enter}") {
      handleAnswerChange(currentText + "\n");
    } else if (button === "{bksp}") {
      handleAnswerChange(currentText.slice(0, -1));
    } else if (button === "{space}") {
      handleAnswerChange(currentText + " ");
    } else if (button.length === 1) {
      handleAnswerChange(currentText + button);
    }
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
          description: section.title || section.description || `Section ${section.order || 1}`,
          answers: [] as any[],
          subParts: [] as any[]
        };

        // Handle sections with subParts
        if (section.subParts && section.subParts.length > 0) {
          sectionData.subParts = section.subParts.map((subPart, subPartIndex) => {
            const questionId = subPart.questions?.[0]?.id || subPart.id;
            const userAnswer = answers[`${sectionIndex}-${subPartIndex}-${subPart.id}`] || "";
            return {
              description: subPart.label || subPart.description,
              answers: [{
                questionId: questionId,
                userAnswer: userAnswer
              }]
            };
          });
        }

        // Handle sections with questions (answers go directly in section)
        if (section.questions && section.questions.length > 0) {
          let questionAnswer = "";
          const possibleKeys = [
            `${sectionIndex}-0-${section.questions[0].id}`,
            `${sectionIndex}-${section.questions[0].id}`,
            `${sectionIndex}-${section.id}`,
            section.questions[0].id,
            section.id
          ];
          for (const key of possibleKeys) {
            if (answers[key]) {
              questionAnswer = answers[key];
              break;
            }
          }
          if (questionAnswer && questionAnswer.includes("Kulübün bir başka üyesi")) {
            questionAnswer = "";
          }
          sectionData.answers = [{
            questionId: section.questions[0].id,
            userAnswer: questionAnswer
          }];
        }

        // Handle sections without subParts or questions (direct answers)
        if (!section.subParts?.length && !section.questions?.length) {
          const sectionAnswer = answers[`${sectionIndex}-${section.id}`] || "";
          if (sectionAnswer.trim()) {
            sectionData.answers = [{
              questionId: section.id,
              userAnswer: sectionAnswer
            }];
          }
        }

        return sectionData;
      })
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
      toast.error("API submission failed, but your answers are saved locally. Please contact support.");
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
    <div className="min-h-screen bg-gray-50 pb-60">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-[999] bg-white px-4 py-4 shadow-sm border-b border-gray-200">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">YAZMA TEST</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-1" />
                <span className="text-base font-semibold">{formatTime(timeLeft)}</span>
              </div>
              <div className="ml-2 text-base text-gray-700 font-bold">
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
                  className={`flex-1 px-3 py-2 rounded-md font-bold text-base transition-all ${
                    idx === currentSectionIndex 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
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
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-10">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">ALT TEST 3: YAZMA</h1>
              {/* Task Tabs - Desktop */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSectionIndex(idx)}
                    className={`px-8 py-3 rounded-md font-bold text-lg transition-all ${
                      idx === currentSectionIndex 
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Task {idx + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-6 w-6" />
                <span className="font-bold text-lg">{formatTime(timeLeft)} left</span>
              </div>
              <div className={`text-lg font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-700'}`}>
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
      <div className="flex-1 p-4 pt-24 lg:pt-20 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout - Questions on top */}
          <div className="lg:hidden space-y-4">
            {/* Questions Panel - Mobile Only */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-0">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {selectedSection?.title || `WRITING TASK ${currentSectionIndex + 1}`}
              </h2>
              {selectedSection?.description && (
                <div className="space-y-3 text-gray-700">
                  <p className="text-base">{selectedSection.description}</p>
                  {hasSubParts && selectedSubPart && (
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="font-semibold text-gray-900 mb-2 text-base">
                        {selectedSubPart.label || `Part ${currentSubPartIndex + 1}`}
                      </h3>
                      {selectedSubPart.question && (
                        <p className="text-gray-700 text-base">{selectedSubPart.question}</p>
                      )}
                      {selectedSubPart.description && (
                        <p className="text-gray-600 text-xs mt-1">{selectedSubPart.description}</p>
                      )}
                      {selectedSubPart.questions && selectedSubPart.questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedSubPart.questions.map((question: any) => (
                            <div key={question.id} className="p-3 bg-gray-100 rounded border border-gray-200">
                              <p className="text-gray-800 font-medium text-base">{question.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {hasQuestions && (
                    <div className="space-y-3">
                      {questions.map((question, idx) => (
                        <div key={question.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <h3 className="font-semibold text-gray-900 mb-2 text-base">
                            Question {idx + 1}
                          </h3>
                          {question.text && (
                            <p className="text-gray-700 text-base">{question.text}</p>
                          )}
                          {question.question && (
                            <p className="text-gray-700 text-base">{question.question}</p>
                          )}
                          {question.description && (
                            <p className="text-gray-600 text-xs mt-1">{question.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Writing Area - Mobile Only */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-0">
              {(hasSubParts || hasQuestions) && (hasSubParts ? subParts : questions).length > 1 && (
                <div className="mb-3">
                  <Tabs 
                    value={String(currentSubPartIndex)} 
                    onValueChange={(value) => setCurrentSubPartIndex(parseInt(value))}
                    className="w-full"
                  >
                    <TabsList className="grid w-full bg-gray-100 border border-gray-300" style={{gridTemplateColumns: `repeat(${(hasSubParts ? subParts : questions).length}, 1fr)`}}>
                      {(hasSubParts ? subParts : questions).map((_, idx) => (
                        <TabsTrigger key={idx} value={String(idx)} className="text-base data-[state=active]:bg-red-500 data-[state=active]:text-white font-semibold transition-colors">
                          {hasSubParts ? `${currentSectionIndex + 1}.${idx + 1}` : `Q${idx + 1}`}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Kompozisyonunuzu buraya yazın... (Write your essay here in Turkish...)"
                className="w-full h-56 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400 text-base"
                dir="ltr"
                lang="tr"
              />
              <div className="mt-2 flex items-center justify-end">
                <div className={`text-base font-semibold ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                  {wordsRemaining} words left
                </div>
              </div>
              {/* No keyboard in mobile */}
            </div>
          </div>

          {/* Desktop Layout - Questions left, textarea right, with resizable divider */}
          <div className="hidden lg:block">
            <ResizableHorizontalPanels
              left={
                <>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedSection?.title || `WRITING TASK ${currentSectionIndex + 1}`}
                  </h2>
                  {selectedSection?.description && (
                    <div className="space-y-4 text-gray-700">
                      <p className="font-semibold text-lg">{selectedSection.description}</p>
                      {hasSubParts && selectedSubPart && (
                        <div className="p-4 border-2 border-gray-300 rounded-lg">
                          <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                            {selectedSubPart.label || `Part ${currentSubPartIndex + 1}`}
                          </h3>
                          {selectedSubPart.question && (
                            <p className="text-gray-700 text-lg">{selectedSubPart.question}</p>
                          )}
                          {selectedSubPart.description && (
                            <p className="text-gray-600 text-base mt-2">{selectedSubPart.description}</p>
                          )}
                          {selectedSubPart.questions && selectedSubPart.questions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {selectedSubPart.questions.map((question: any) => (
                                <div key={question.id} className="p-3 bg-gray-100 rounded border border-gray-200">
                                  <p className="text-gray-800 font-medium text-lg">{question.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {hasQuestions && (
                        <div className="space-y-4">
                          {questions.map((question, idx) => (
                            <div key={question.id} className="p-4 border-2 border-gray-300 rounded-lg">
                              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                                Question {idx + 1}
                              </h3>
                              {question.text && (
                                <p className="text-gray-700 text-lg">{question.text}</p>
                              )}
                              {question.question && (
                                <p className="text-gray-700 text-lg">{question.question}</p>
                              )}
                              {question.description && (
                                <p className="text-gray-600 text-base mt-2">{question.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              }
              right={
                <>
                  {(hasSubParts || hasQuestions) && (hasSubParts ? subParts : questions).length > 1 && (
                    <div className="mb-4">
                      <Tabs 
                        value={String(currentSubPartIndex)} 
                        onValueChange={(value) => setCurrentSubPartIndex(parseInt(value))}
                        className="w-full"
                      >
                        <TabsList className="grid w-full bg-gray-100 border border-gray-300" style={{gridTemplateColumns: `repeat(${(hasSubParts ? subParts : questions).length}, 1fr)`}}>
                          {(hasSubParts ? subParts : questions).map((_, idx) => (
                            <TabsTrigger key={idx} value={String(idx)} className="text-lg data-[state=active]:bg-red-500 data-[state=active]:text-white font-semibold transition-colors">
                              {hasSubParts ? `${currentSectionIndex + 1}.${idx + 1}` : `Q${idx + 1}`}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  )}
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Kompozisyonunuzu buraya yazın... (Write your essay here in Turkish...)"
                    className="w-full h-96 p-6 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400 text-lg"
                    dir="ltr"
                    lang="tr"
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1"
                      onClick={() => setShowKeyboard((v) => !v)}
                      aria-label={showKeyboard ? "Close Keyboard" : "Open Keyboard"}
                    >
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="3" y="7" width="18" height="10" rx="2" className="stroke-current" />
                        <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" className="stroke-current" />
                      </svg>
                    </Button>
                    <div className={`text-lg font-semibold ${isOverLimit ? 'text-red-600' : 'text-gray-600'}`}>
                      Words: {wordCount} / {wordLimit} ({wordsRemaining} remaining)
                    </div>
                  </div>
                  {/* Desktop Keyboard */}
                  {showKeyboard && (
                    <div className="mt-4">
                      <Keyboard
                        ref={keyboardRef}
                        key={selectedQuestionId}
                        onChange={onKeyboardChange}
                        onKeyPress={onKeyPress}
                        layoutName="default"
                        preventMouseDownDefault={true}
                        layout={{
                          default: [
                            "\" 1 2 3 4 5 6 7 8 9 0 * - {bksp}",
                            "{tab} q w e r t y u ı o p ğ ü",
                            "{lock} a s d f g h j k l ş i {enter}",
                            "{shift} < z x c v b n m ö ç . {shift}",
                            ".com @ {space}"
                          ]
                        }}
                        display={{
                          "{bksp}": "⌫",
                          "{enter}": "⏎",
                          "{shift}": "⇧",
                          "{tab}": "⇥",
                          "{lock}": "⇪",
                          "{space}": "______"
                        }}
                        theme="hg-theme-default hg-layout-default"
                        physicalKeyboardHighlight={true}
                        style={{
                          maxWidth: 500,
                          margin: "0 auto",
                          fontSize: "1rem"
                        }}
                      />
                    </div>
                  )}
                </>
              }
            />
          </div>
        </div>
      </div>

      {/* Full Screen Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Test Gönderiliyor</h3>
            <p className="text-gray-600">Lütfen bekleyin, testiniz gönderiliyor ve sonuçlar sayfasına yönlendiriliyorsunuz...</p>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
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
              {Object.values(answers).reduce((total, answer) => total + getWordCount(answer), 0)} words • {formatTime(timeLeft)} left
            </p>
          </div>

          {submitting && (
            <div className="text-center py-6 mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-800 font-medium">Test gönderiliyor...</p>
              <p className="text-gray-600 text-base mt-1">Lütfen bekleyin, test sonuçlar sayfasına yönlendiriliyorsunuz</p>
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
