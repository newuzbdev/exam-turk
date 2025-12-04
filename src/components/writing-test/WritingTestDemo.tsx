import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
// import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import writingTestService, {
  type WritingTestItem,
} from "@/services/writingTest.service";
// import writingSubmissionService from "@/services/writingSubmission.service";
import { overallTestFlowStore } from "@/services/overallTest.service";

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
        // Only remove exam-mode if not in overall test flow
        // Check if there are remaining tests in the overall flow
        const hasActiveOverallTest = overallTestFlowStore.hasActive();
        if (!hasActiveOverallTest) {
          document.body.classList.remove("exam-mode");
        } else {
          // Ensure exam-mode stays active for next test
          document.body.classList.add("exam-mode");
        }
      };
    }
  }, []);

  // Fetch test data on component mount
  useEffect(() => {
    const load = async () => {
      if (!testId) return;
      setLoading(true);
      try {
        // First try to get pre-loaded data from sessionStorage
        const cachedData = sessionStorage.getItem(`test_data_WRITING_${testId}`);
        let t;
        
        if (cachedData) {
          t = JSON.parse(cachedData);
        } else {
          // Fallback to API call if no cached data
          t = await writingTestService.getById(testId);
        }
        
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
        // toast.error("Test yüklenirken hata oluştu");
        console.error("Error loading test:", error);
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
      // toast.error("Time is up! Test will be submitted automatically.");
      handleSubmit();
    }
  }, [timeLeft]);

  const selectedSection = sections[currentSectionIndex];
  const subParts = selectedSection?.subParts || [];
  
  // Extract questions - check both section level and subPart level
  const questions = useMemo(() => {
    // First check if section has questions directly
    if (selectedSection?.questions && selectedSection.questions.length > 0) {
      return selectedSection.questions;
    }
    // If no section-level questions, check subParts
    if (subParts.length > 0) {
      const currentSubPart = subParts[currentSubPartIndex];
      return currentSubPart?.questions || [];
    }
    return [];
  }, [selectedSection, subParts, currentSubPartIndex]);
  
  const hasSubParts = subParts.length > 0;
  const hasQuestions = questions.length > 0;
  const selectedSubPart = hasSubParts
    ? subParts[currentSubPartIndex]
    : undefined;
  const selectedQuestion = hasQuestions
    ? questions[currentSubPartIndex]
    : undefined;
  
  // Determine what items to show in tabs
  const tabItems = hasSubParts ? subParts : questions;
  const showTabs = tabItems.length > 1;
  

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
    console.log("Answer change - selectedQuestionId:", selectedQuestionId, "value:", value);
    setAnswers((prev) => {
      const newAnswers = {
        ...prev,
        [selectedQuestionId]: value,
      };
      console.log("Updated answers:", newAnswers);
      return newAnswers;
    });
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
  const turkishChars = [
  { char: "Ç", lower: "ç", shortcut: "C=" },
  { char: "Ğ", lower: "ğ", shortcut: "G=" },
  { char: "İ", lower: "i", shortcut: "I=" },
  { char: "Ö", lower: "ö", shortcut: "O=" },
  { char: "Ş", lower: "ş", shortcut: "S=" },
  { char: "Ü", lower: "ü", shortcut: "U=" },
  { char: "I", lower: "ı", shortcut: "i=" },
  ];
  
  return (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
  <div className="text-sm text-gray-700 mb-3">
  <span className="font-semibold">Türkçe Karakterler:</span> Klavye kısayolları: c=→ç, g=→ğ, s=→ş, o=→ö, u=→ü, i=→ı, I=→İ
  </div>
  <div className="grid grid-cols-7 gap-2 max-w-md">
  {turkishChars.map(({ char, lower, shortcut }) => (
  <div key={char} className="flex flex-col gap-1">
  <button
  type="button"
  onClick={() => insertChar(char)}
  className="h-10 w-full border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-300 text-lg font-medium text-gray-800 transition-colors flex items-center justify-center"
  title={`Insert ${char} (or type ${shortcut})`}
  >
  {char}
  </button>
  <button
  type="button"
  onClick={() => insertChar(lower)}
  className="h-10 w-full border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-300 text-lg font-medium text-gray-800 transition-colors flex items-center justify-center"
  title={`Insert ${lower} (or type ${shortcut.toLowerCase()})`}
  >
  {lower}
  </button>
  </div>
  ))}
  </div>
  <div className="mt-2 text-xs text-gray-500">
  Kopyala: Ctrl+C | Yapıştır: Ctrl+V
  </div>
  </div>
  );
  };
  
  // Shortcut legend removed (unused)

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getWordLimit = () => {
    if (currentSectionIndex === 1) return 200; // Part 2 (Task 2)
    // Part 1 (Task 1) - check subPart
    if (hasSubParts) {
      if (currentSubPartIndex === 0) return 50; // 1.1
      if (currentSubPartIndex === 1) return 150; // 1.2
    }
    return 200; // Default fallback
  };

  const currentAnswer = answers[selectedQuestionId] || "";
  console.log("Current answer for selectedQuestionId:", selectedQuestionId, "is:", currentAnswer);
  console.log("All answers:", answers);
  const wordCount = getWordCount(currentAnswer);
  const wordLimit = getWordLimit();
  // const wordsRemaining = Math.max(0, wordLimit - wordCount);
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

    // Store answers locally for later submission
    const answersData = {
      testId: testId,
      answers: answers,
      sections: sections,
      timestamp: new Date().toISOString()
    };
    // Debug: Log the answers being stored
    console.log("Writing answers being stored:", answers);
    console.log("Writing answers data:", answersData);
    // Store in sessionStorage for later submission
    sessionStorage.setItem(`writing_answers_${testId}`, JSON.stringify(answersData));

    // Just navigate to next test without submitting
    const nextPath = overallTestFlowStore.onTestCompleted("WRITING", testId);
    if (nextPath) {
      // Ensure exam mode and fullscreen stay active for next test
      if (typeof document !== "undefined") {
        document.body.classList.add("exam-mode");
        // Immediately re-enter fullscreen before navigation
        const enterFullscreen = async () => {
          try {
            const el: any = document.documentElement as any;
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) await el.msRequestFullscreen();
          } catch {}
        };
        await enterFullscreen();
      }
      navigate(nextPath);
      return;
    }
    
    // If no next test, we're at the end - submit all tests
    const overallId = overallTestFlowStore.getOverallId();
    if (overallId && overallTestFlowStore.isAllDone()) {
      // Submit all tests at once
      await submitAllTests(overallId);
      return;
    }
    
    // Fallback to single test results
    navigate(`/writing-test/results/temp`, { state: { summary: { testId: testId } } });
    setSubmitting(false);
  };

  const submitAllTests = async (overallId: string) => {
    try {
      // toast.info("Submitting all tests...");
      
      // Submit all individual tests first
      const { readingSubmissionService } = await import("@/services/readingTest.service");
      const { listeningSubmissionService } = await import("@/services/listeningTest.service");
      const { writingSubmissionService } = await import("@/services/writingSubmission.service");
      const axiosPrivate = (await import("@/config/api")).default;
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          console.log("Okuma testi gönderiliyor:", readingData.testId, "cevaplarla:", readingData.answers);
          
          // Bu testin genel test akışının parçası olup olmadığını kontrol et
          const { overallTestTokenStore } = await import("@/services/overallTest.service");
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          
          if (overallToken) {
            console.log("✅ Okuma testi genel token'a sahip, gönderiliyor...");
            const payload = Object.entries(readingData.answers).map(([questionId, userAnswer]) => ({ 
              questionId, 
              userAnswer: String(userAnswer) 
            }));
            await readingSubmissionService.submitAnswers(readingData.testId, payload, overallToken);
          } else {
            console.log("⚠️ Okuma testi genel akışın parçası değil, gönderim atlanıyor");
          }
        }
      }
      
      // Dinleme testini gönder - herhangi bir testten dinleme cevaplarını ara
      const listeningAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('listening_answers_'));
      for (const key of listeningAnswersKeys) {
        const listeningAnswers = sessionStorage.getItem(key);
        if (listeningAnswers) {
          const listeningData = JSON.parse(listeningAnswers);
          console.log("Dinleme testi gönderiliyor:", listeningData.testId, "cevaplarla:", listeningData.answers, "audioUrl:", listeningData.audioUrl, "imageUrls:", listeningData.imageUrls);
          
          // Bu testin genel test akışının parçası olup olmadığını kontrol et
          const { overallTestTokenStore } = await import("@/services/overallTest.service");
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          
          if (overallToken) {
            console.log("✅ Dinleme testi genel token'a sahip, gönderiliyor...");
            await listeningSubmissionService.submitAnswers(
              listeningData.testId, 
              listeningData.answers,
              overallToken,
              listeningData.audioUrl,
              listeningData.imageUrls
            );
          } else {
            console.log("⚠️ Dinleme testi genel akışın parçası değil, gönderim atlanıyor");
            // Atlayabilir veya oturum token'ını yedek olarak kullanabilirsiniz
            // await listeningSubmissionService.submitAnswers(listeningData.testId, listeningData.answers);
          }
        }
      }
      
      // Yazma testini gönder
      const writingAnswers = sessionStorage.getItem(`writing_answers_${testId}`);
      console.log("SessionStorage'dan yazma cevapları alındı:", writingAnswers);
      if (writingAnswers) {
        const writingData = JSON.parse(writingAnswers);
        console.log("Ayrıştırılmış yazma verisi:", writingData);
        console.log("Verideki yazma cevapları:", writingData.answers);
        const payload = {
          writingTestId: writingData.testId,
          sections: writingData.sections.map((section: any, sectionIndex: number) => {
            const sectionData = {
              description: section.title || section.description || `Section ${section.order || 1}`,
              answers: [] as any[],
              subParts: [] as any[],
            };
            if (section.subParts && section.subParts.length > 0) {
              sectionData.subParts = section.subParts.map((subPart: any, subPartIndex: number) => {
                const questionId = subPart.questions?.[0]?.id || subPart.id;
                const userAnswer = writingData.answers[`${sectionIndex}-${subPartIndex}-${subPart.id}`] || "";
                return {
                  description: subPart.label || subPart.description,
                  answers: [{ questionId, userAnswer }],
                };
              });
            }
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
                if (writingData.answers[key]) {
                  questionAnswer = writingData.answers[key];
                  break;
                }
              }
              sectionData.answers = [{ questionId: section.questions[0].id, userAnswer: questionAnswer }];
            }
            return sectionData;
          }),
        };
        await writingSubmissionService.create(payload);
      }
      
      // Submit speaking test - look for speaking answers from any test
      const speakingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('speaking_answers_'));
      for (const key of speakingAnswersKeys) {
        const speakingAnswers = sessionStorage.getItem(key);
        if (speakingAnswers) {
          const speakingData = JSON.parse(speakingAnswers);
          console.log("Submitting speaking test:", speakingData.testId, "with recordings:", speakingData.recordings?.length || 0);
          const answerMap = new Map();
          for (const [qid, rec] of speakingData.recordings) {
            try {
              const fd = new FormData();
              fd.append("audio", rec.blob, "recording.webm");
              const res = await axiosPrivate.post("/api/speaking-submission/speech-to-text", fd, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 30000,
              });
              const text = res.data?.text || "[Ses metne dönüştürülemedi]";
              answerMap.set(qid, { text, duration: rec.duration });
            } catch (e) {
              answerMap.set(qid, { text: "[Ses metne dönüştürülemedi]", duration: rec.duration || 0 });
            }
          }
          
          const parts = speakingData.sections.map((s: any) => {
            const p: any = { description: s.description, image: "" };
            if (s.subParts?.length) {
              const subParts = s.subParts.map((sp: any) => {
                const questions = sp.questions.map((q: any) => {
                  const a = answerMap.get(q.id);
                  return {
                    questionId: q.id,
                    userAnswer: a?.text ?? "[Cevap bulunamadı]",
                    duration: a?.duration ?? 0,
                  };
                });
                const duration = questions.reduce((acc: number, q: any) => acc + (q.duration || 0), 0);
                return { image: sp.images?.[0] || "", duration, questions };
              });
              const duration = subParts.reduce((acc: number, sp: any) => acc + (sp.duration || 0), 0);
              p.subParts = subParts;
              p.duration = duration;
            } else {
              const questions = s.questions.map((q: any) => {
                const a = answerMap.get(q.id);
                return {
                  questionId: q.id,
                  userAnswer: a?.text ?? "[Cevap bulunamadı]",
                  duration: a?.duration ?? 0,
                };
              });
              const duration = questions.reduce((acc: number, q: any) => acc + (q.duration || 0), 0);
              p.questions = questions;
              p.duration = duration;
              if (s.type === "PART3") p.type = "DISADVANTAGE";
            }
            return p;
          });
          
          await axiosPrivate.post("/api/speaking-submission", {
            speakingTestId: speakingData.testId,
            parts,
          });
        }
      }
      
      // Now complete the overall test
      if (!overallTestFlowStore.isCompleted()) {
        const { overallTestService } = await import("@/services/overallTest.service");
        await overallTestService.complete(overallId);
        overallTestFlowStore.markCompleted();
      }
      
      // Exit fullscreen and go to results
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      navigate(`/overall-results/${overallId}`);
    } catch (error) {
      console.error("Error submitting all tests:", error);
      // toast.error("Error submitting tests, but continuing to results...");
      navigate(`/overall-results/${overallId}`);
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
          {/* Top Row - Title, Timer (center), Submit */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              YAZMA TEST
            </h1>
            
            {/* Timer in center */}
            <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded">
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-sm font-semibold">
                {formatTime(timeLeft)}
              </span>
            </div>
            
            {/* Submit button */}
            <Button
              onClick={() => setShowSubmitModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold rounded-lg"
            >
              GÖNDER
            </Button>
          </div>
          
          {/* Second Row - Word Count with Part Info */}
          <div className="flex items-center justify-center mb-3">
            <div className={`text-sm font-semibold px-3 py-1 rounded ${isOverLimit ? "text-red-600 bg-red-50" : "text-gray-700 bg-gray-100"}`}>
              {wordCount}/{wordLimit} kelime
              {hasSubParts ? (
                currentSubPartIndex === 0 ? " (Part 1.1)" : " (Part 1.2)"
              ) : (
                " (Part 2)"
              )}
            </div>
          </div>
          
          {/* Mobile Task Tabs - Smaller height */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {sections.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSectionIndex(idx)}
                className={`flex-1 px-3 py-1.5 rounded-md font-medium text-sm transition-all ${idx === currentSectionIndex
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                  }`}
              >
                Part {idx + 1}
              </button>
            ))}
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
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-lg font-bold"
              >
                GÖNDER
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 pt-24 lg:pt-20 lg:p-8">
        <div className="max-w-8xl mx-auto">
          {/* Mobile Layout - Questions on top */}
          <div className="lg:hidden space-y-3">
            {/* Questions Panel - Mobile Only */}
            <div className="bg-white rounded-xl shadow-sm p-4">
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
                          {"question" in question && (question as any).question && (
                            <p className="text-gray-700 text-base">
                              {(question as any).question}
                            </p>
                          )}
                          {"description" in question && (question as any).description && (
                            <p className="text-gray-600 text-xs mt-1">
                              {(question as any).description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Questions Display - Mobile Only */}
            {questions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {selectedSection?.title || `WRITING TASK ${currentSectionIndex + 1}`}
                </h2>
                <div className="space-y-3">
                      {questions.map((question, idx) => (
                    <div key={question.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-2 text-base">Question {idx + 1}</h3>
                      {question.text && <p className="text-gray-700 text-base">{question.text}</p>}
                      {"question" in question && (question as any).question && (
                        <p className="text-gray-700 text-base">{(question as any).question}</p>
                      )}
                      {"description" in question && (question as any).description && (
                        <p className="text-gray-600 text-sm mt-1">{(question as any).description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Writing Area - Mobile Only */}
            <div className="bg-white rounded-xl shadow-sm p-4 mt-0">
              {showTabs && (
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
                        {tabItems.map((_, idx) => (
                          <TabsTrigger
                            key={idx}
                            value={String(idx)}
                            className={`
                            flex-1 px-0 py-2 text-base font-medium border-none rounded-none
                            transition-all
                            relative
                            ${idx === 0 ? "rounded-l-lg" : ""}
                            ${idx === (tabItems.length - 1) ? "rounded-r-lg" : ""}
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
              <textarea
                ref={textareaRef}
                onKeyDown={handleShortcutKeyDown}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type your essay here.."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400 text-base"
                dir="ltr"
                lang="tr"
              />
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
                  {/* Questions Display - Always show */}
                  {questions.length > 0 && (
                    <div className="space-y-4 mt-4">
                      {questions.map((question, idx) => (
                        <div key={question.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <h3 className="font-medium text-gray-900 mb-2 text-lg">Question {idx + 1}</h3>
                          {question.text && <p className="text-gray-700 text-lg">{question.text}</p>}
                          {"question" in question && (question as any).question && (
                            <p className="text-gray-700 text-lg">{(question as any).question}</p>
                          )}
                          {"description" in question && (question as any).description && (
                            <p className="text-gray-600 text-base mt-2">{(question as any).description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSection?.description && (
                    <div className="space-y-4 text-gray-700 mt-4">
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
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="mx-3" />
              <ResizablePanel defaultSize={55} className="min-w-0">
                <div className="bg-white rounded-xl shadow-md p-6 flex-1 min-w-0 h-[calc(100vh-140px)] overflow-y-auto flex flex-col">
                  {showTabs && (
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
                          {tabItems.map((_, idx) => (
                            <TabsTrigger
                              key={idx}
                              value={String(idx)}
                              className={`
                                flex-1 px-0 py-3 text-lg font-medium border-none rounded-none
                                transition-all
                                relative
                                ${idx === 0 ? "rounded-l-lg" : ""}
                                ${idx === (tabItems.length - 1) ? "rounded-r-lg" : ""}
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
                  {renderKeyboard()}

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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmit}
        title="Testi Gönder"
        message="Testi göndermek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Gönder"
        cancelText="İptal"
        isLoading={submitting}
      />
    </div>
  );
}
