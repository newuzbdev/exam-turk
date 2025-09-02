import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Keyboard from "react-simple-keyboard";
import "simple-keyboard/build/css/index.css";
import writingTestService, { type WritingTestItem } from "@/services/writingTest.service";
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
      const id = `${currentSectionIndex}-${currentSubPartIndex}-${selectedSubPart.id}`;
      console.log("Using subPart ID:", id, "for section:", currentSectionIndex, "subPart:", currentSubPartIndex);
      return id;
    }
    if (hasQuestions && selectedQuestion) {
      const id = `${currentSectionIndex}-${currentSubPartIndex}-${selectedQuestion.id}`;
      console.log("Using question ID:", id, "for section:", currentSectionIndex, "question:", currentSubPartIndex);
      return id;
    }
    const id = `${currentSectionIndex}-${selectedSection?.id || "0"}`;
    console.log("Using section ID:", id);
    return id;
  }, [selectedSection?.id, selectedSubPart?.id, selectedQuestion?.id, hasSubParts, hasQuestions, currentSectionIndex, currentSubPartIndex]);

  const handleAnswerChange = (value: string) => {
    console.log("=== ANSWER CHANGE ===");
    console.log("Section:", currentSectionIndex, "SubPart:", currentSubPartIndex);
    console.log("Storing answer for questionId:", selectedQuestionId);
    console.log("Value:", value.substring(0, 50) + "...");
    console.log("Current answers state:", Object.keys(answers));
    setAnswers((prev) => {
      const newAnswers = { ...prev, [selectedQuestionId]: value };
      console.log("New answers state:", Object.keys(newAnswers));
      return newAnswers;
    });
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
  
  console.log("=== CURRENT ANSWER DEBUG ===");
  console.log("Current selectedQuestionId:", selectedQuestionId);
  console.log("Current answer for this ID:", currentAnswer);
  console.log("All answers:", answers);

  const onKeyboardChange = (input: string) => {
    console.log("=== KEYBOARD CHANGE ===");
    console.log("Keyboard input:", input);
    console.log("Current selectedQuestionId:", selectedQuestionId);
    console.log("Previous answer:", currentAnswer);
    // Don't call handleAnswerChange here - let onKeyPress handle individual keys
  };

  const onKeyPress = (button: string) => {
    console.log("=== KEY PRESS ===", button);
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
      // Single character - append to existing text
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
          console.log("SubParts structure:", JSON.stringify(section.subParts, null, 2));
          sectionData.subParts = section.subParts.map((subPart, subPartIndex) => {
            // Use the actual question ID from subPart.questions, not subPart.id
            const questionId = subPart.questions?.[0]?.id || subPart.id;
            const userAnswer = answers[`${sectionIndex}-${subPartIndex}-${subPart.id}`] || "";
            
            console.log(`SubPart ${subPartIndex}: questionId=${questionId}, userAnswer length=${userAnswer.length}`);
            
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
          console.log("=== SUBMISSION DEBUG FOR SECTION", sectionIndex, "===");
          console.log("Section has questions:", section.questions.length);
          console.log("All answer keys:", Object.keys(answers));
          
          // Try multiple ID formats to find the answer
          let questionAnswer = "";
          const possibleKeys = [
            `${sectionIndex}-0-${section.questions[0].id}`, // composite format
            `${sectionIndex}-${section.questions[0].id}`, // section-question format  
            `${sectionIndex}-${section.id}`, // section-based format (Part 2 uses this!)
            section.questions[0].id, // direct question ID
            section.id // section ID
          ];
          
          console.log("Trying keys:", possibleKeys);
          for (const key of possibleKeys) {
            if (answers[key]) {
              questionAnswer = answers[key];
              console.log("Found answer with key:", key, "value:", questionAnswer.substring(0, 50));
              break;
            }
          }
          
          // Make sure we're not sending question text as answer
          if (questionAnswer && questionAnswer.includes("Kulübün bir başka üyesi")) {
            console.log("WARNING: Found question text in answer, clearing it");
            questionAnswer = "";
          }
          
          sectionData.answers = [{
            questionId: section.questions[0].id,
            userAnswer: questionAnswer
          }];
          console.log("Final answer for section", sectionIndex, ":", questionAnswer.substring(0, 50));
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

    console.log("Current answers state:", answers);
    console.log("Sections structure:", JSON.stringify(sections, null, 2));
    console.log("Submission payload:", JSON.stringify(payload, null, 2));

    try {
      const res = await writingSubmissionService.create(payload);
      setSubmitting(false);
      if (res) {
        toast.success("Your answers have been saved successfully!");
        // Navigate to results page with the submission ID
        navigate(`/writing-test/results/${res.id}`);
      }
    } catch (err: any) {
      setSubmitting(false);
      console.error("Submission error:", err);
      console.log("Submission failed, payload was:", payload);
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
      <div className="fixed top-0 left-0 right-0 z-[999] bg-white px-4 py-3 shadow-sm">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">YAZMA TEST</h1>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{formatTime(timeLeft)}</span>
              </div>
              
              <Button 
                onClick={() => setShowSubmitModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 text-sm"
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
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all ${
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
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">ALT TEST 3: YAZMA</h1>
              
              {/* Task Tabs - Desktop */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSectionIndex(idx)}
                    className={`px-6 py-2 rounded-md font-semibold transition-all ${
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
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span className="font-medium">{formatTime(timeLeft)} remaining</span>
              </div>
              
              <Button 
                onClick={() => setShowSubmitModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 pt-28 lg:pt-24 lg:p-6">
        <div className="max-w-7xl mx-auto">


          {/* Mobile Layout - Questions on top */}
          <div className="lg:hidden space-y-4">
            {/* Questions Panel - Mobile Only */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {selectedSection?.title || `WRITING TASK ${currentSectionIndex + 1}`}
              </h2>
              
              {selectedSection?.description && (
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm">{selectedSection.description}</p>
                  
                  {hasSubParts && selectedSubPart && (
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-2 text-sm">
                        {selectedSubPart.label || `Part ${currentSubPartIndex + 1}`}
                      </h3>
                      {selectedSubPart.question && (
                        <p className="text-gray-700 text-sm">{selectedSubPart.question}</p>
                      )}
                      {selectedSubPart.description && (
                        <p className="text-gray-600 text-xs mt-1">{selectedSubPart.description}</p>
                      )}
                      {/* Render questions from subPart.questions - Mobile */}
                      {selectedSubPart.questions && selectedSubPart.questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedSubPart.questions.map((question: any) => (
                            <div key={question.id} className="p-3 bg-gray-100 rounded border border-gray-200">
                              <p className="text-gray-800 font-medium text-sm">{question.text}</p>
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
                          <h3 className="font-medium text-gray-900 mb-2 text-sm">
                            Question {idx + 1}
                          </h3>
                          {question.text && (
                            <p className="text-gray-700 text-sm">{question.text}</p>
                          )}
                          {question.question && (
                            <p className="text-gray-700 text-sm">{question.question}</p>
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              {/* Sub-part or Question Tabs */}
              {(hasSubParts || hasQuestions) && (hasSubParts ? subParts : questions).length > 1 && (
                <div className="mb-4">
                  <Tabs 
                    value={String(currentSubPartIndex)} 
                    onValueChange={(value) => setCurrentSubPartIndex(parseInt(value))}
                    className="w-full"
                  >
                    <TabsList className="grid w-full bg-gray-100 border border-gray-300" style={{gridTemplateColumns: `repeat(${(hasSubParts ? subParts : questions).length}, 1fr)`}}>
                      {(hasSubParts ? subParts : questions).map((_, idx) => (
                        <TabsTrigger key={idx} value={String(idx)} className="text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium transition-colors">
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
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400"
                dir="ltr"
                lang="tr"
              />
              
              <div className="mt-3 flex items-center justify-between">
                <div className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-600'}`}>
                  Words: {wordCount} / {wordLimit} ({wordsRemaining} remaining)
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Questions on top, textarea below */}
          <div className="hidden lg:block space-y-4">
            {/* Questions Panel - Desktop */}
            <div className="bg-white rounded-xl border-2 border-gray-300 shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedSection?.title || `WRITING TASK ${currentSectionIndex + 1}`}
              </h2>
              
              {selectedSection?.description && (
                <div className="space-y-4 text-gray-700">
                  <p className="font-medium">{selectedSection.description}</p>
                  
                  {hasSubParts && selectedSubPart && (
                    <div className="p-4 border-2 border-gray-300 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">
                        {selectedSubPart.label || `Part ${currentSubPartIndex + 1}`}
                      </h3>
                      {selectedSubPart.question && (
                        <p className="text-gray-700">{selectedSubPart.question}</p>
                      )}
                      {selectedSubPart.description && (
                        <p className="text-gray-600 text-sm mt-2">{selectedSubPart.description}</p>
                      )}
                      {/* Render questions from subPart.questions */}
                      {selectedSubPart.questions && selectedSubPart.questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedSubPart.questions.map((question: any) => (
                            <div key={question.id} className="p-3 bg-gray-100 rounded border border-gray-200">
                              <p className="text-gray-800 font-medium">{question.text}</p>
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
                          <h3 className="font-medium text-gray-900 mb-2">
                            Question {idx + 1}
                          </h3>
                          {question.text && (
                            <p className="text-gray-700">{question.text}</p>
                          )}
                          {question.question && (
                            <p className="text-gray-700">{question.question}</p>
                          )}
                          {question.description && (
                            <p className="text-gray-600 text-sm mt-2">{question.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Writing Area - Desktop */}
            <div className="bg-white rounded-xl border-2 border-gray-300 shadow-lg p-6">
              {/* Sub-part or Question Tabs */}
              {(hasSubParts || hasQuestions) && (hasSubParts ? subParts : questions).length > 1 && (
                <div className="mb-4">
                  <Tabs 
                    value={String(currentSubPartIndex)} 
                    onValueChange={(value) => setCurrentSubPartIndex(parseInt(value))}
                    className="w-full"
                  >
                    <TabsList className="grid w-full bg-gray-100 border border-gray-300" style={{gridTemplateColumns: `repeat(${(hasSubParts ? subParts : questions).length}, 1fr)`}}>
                      {(hasSubParts ? subParts : questions).map((_, idx) => (
                        <TabsTrigger key={idx} value={String(idx)} className="text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium transition-colors">
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
                className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400"
                dir="ltr"
                lang="tr"
              />
              
              <div className="mt-4 flex items-center justify-between">
                <div className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-600'}`}>
                  Words: {wordCount} / {wordLimit} ({wordsRemaining} remaining)
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Turkish Virtual Keyboard - Hidden on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-gray-300 shadow-2xl hidden lg:block">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-center mb-2">
            <span className="text-lg font-bold text-gray-700">🇹🇷 Turkish Virtual Keyboard</span>
          </div>
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
          />
        </div>
      </div>

      {/* Submit Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-sm p-6 rounded-2xl">
          {/* Simple Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-black mb-2">Submit Test</h2>
            <p className="text-gray-600 text-sm">
              {Object.values(answers).reduce((total, answer) => total + getWordCount(answer), 0)} words • {formatTime(timeLeft)} left
            </p>
          </div>

          {submitting && (
            <div className="text-center py-4 mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Submitting...</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
              disabled={submitting}
              className="flex-1 py-3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3"
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
