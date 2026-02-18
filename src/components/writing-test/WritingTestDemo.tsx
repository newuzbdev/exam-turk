import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Clock3 } from "lucide-react";
import writingTestService, {
  type WritingTestItem,
} from "@/services/writingTest.service";
// import writingSubmissionService from "@/services/writingSubmission.service";
import { overallTestFlowStore } from "@/services/overallTest.service";
import { normalizeDisplayText } from "@/utils/text";

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

interface WritingProgressSnapshot {
  currentSectionIndex: number;
  currentSubPartIndex: number;
  timeLeft: number;
  fontScale: number;
  showPracticeModal: boolean;
  practiceText: string;
  answers: Record<string, string>;
  updatedAt: number;
}

const SUBMIT_RETRY_GUIDE = "Cevaplariniz bu tarayicida guvenle saklandi.";

const buildSubmitRetryMessage = (errorLike: unknown, fallback: string) => {
  const raw =
    typeof errorLike === "string"
      ? errorLike
      : errorLike && typeof errorLike === "object" && "message" in errorLike
      ? String((errorLike as any).message || "")
      : "";

  const base = raw.trim() || fallback;
  const normalized = base.toLowerCase();
  const isTokenError =
    /(token|session|oturum)/i.test(normalized) &&
    /(expired|not found|invalid|suresi|dol|bulunamad|gecersiz)/i.test(normalized);

  if (isTokenError) {
    return "Oturum tarafinda gecici bir hata olustu. Sistem gonderimi otomatik olarak tekrar deneyecek.";
  }

  if (base.includes(SUBMIT_RETRY_GUIDE)) return base;
  return `${base}. ${SUBMIT_RETRY_GUIDE}`;
};

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
  const [fontScale, setFontScale] = useState(0.95);
  const [showPracticeModal, setShowPracticeModal] = useState(true);
  const [practiceText, setPracticeText] = useState("");
  const baseFontSizeRef = useRef<string | null>(null);
  const submitAllRetryRef = useRef(0);
  const [showShortcuts] = useState(true);
  const hasRestoredProgressRef = useRef(false);
  const restoredProgressRef = useRef<Partial<WritingProgressSnapshot> | null>(null);
  const progressStorageKey = `writing_progress_${testId}`;

  // Hide navbar and footer during writing test
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("exam-mode");
      // Allow scrolling for writing test - override exam-mode overflow restriction
      document.documentElement.style.overflowY = "auto";
      document.body.style.overflowY = "auto";
      return () => {
        // Only remove exam-mode if not in overall test flow
        // Check if there are remaining tests in the overall flow
        const hasActiveOverallTest = overallTestFlowStore.hasActive();
        if (!hasActiveOverallTest) {
          document.body.classList.remove("exam-mode");
          document.documentElement.style.overflowY = "";
          document.body.style.overflowY = "";
        } else {
          // Ensure exam-mode stays active for next test
          document.body.classList.add("exam-mode");
        }
      };
    }
  }, []);

  useEffect(() => {
    hasRestoredProgressRef.current = false;
    restoredProgressRef.current = null;
    if (!testId) {
      hasRestoredProgressRef.current = true;
      return;
    }

    let parsed: Partial<WritingProgressSnapshot> | null = null;
    try {
      const raw = sessionStorage.getItem(progressStorageKey);
      if (raw) parsed = JSON.parse(raw) as Partial<WritingProgressSnapshot>;
    } catch {}

    if (parsed && typeof parsed === "object") {
      restoredProgressRef.current = parsed;

      const restoredSectionIndex = Number(parsed.currentSectionIndex);
      if (Number.isFinite(restoredSectionIndex)) {
        setCurrentSectionIndex(Math.max(0, Math.round(restoredSectionIndex)));
      }

      const restoredSubPartIndex = Number(parsed.currentSubPartIndex);
      if (Number.isFinite(restoredSubPartIndex)) {
        setCurrentSubPartIndex(Math.max(0, Math.round(restoredSubPartIndex)));
      }

      const restoredTimeLeft = Number(parsed.timeLeft);
      if (Number.isFinite(restoredTimeLeft)) {
        setTimeLeft(Math.max(0, Math.round(restoredTimeLeft)));
      }

      const restoredFontScale = Number(parsed.fontScale);
      if (Number.isFinite(restoredFontScale)) {
        setFontScale(Math.min(1.2, Math.max(0.9, Math.round(restoredFontScale * 100) / 100)));
      }

      if (typeof parsed.showPracticeModal === "boolean") {
        setShowPracticeModal(parsed.showPracticeModal);
      }

      if (typeof parsed.practiceText === "string") {
        setPracticeText(parsed.practiceText);
      }

      if (parsed.answers && typeof parsed.answers === "object") {
        setAnswers(parsed.answers as Record<string, string>);
      }
    }

    hasRestoredProgressRef.current = true;
  }, [testId, progressStorageKey]);

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
        const hasRestoredTime =
          restoredProgressRef.current &&
          Number.isFinite(Number(restoredProgressRef.current.timeLeft));
        if (t?.instruction && !hasRestoredTime) {
          const timeMatch = t.instruction.match(/(\d+)\s*minutes?/i);
          if (timeMatch) {
            setTimeLeft(parseInt(timeMatch[1]) * 60);
          }
        }
        
        // Load existing answers from sessionStorage
        const savedAnswers = sessionStorage.getItem(`writing_answers_${testId}`);
        const restoredAnswers = restoredProgressRef.current?.answers;
        const hasRestoredAnswers =
          !!restoredAnswers && typeof restoredAnswers === "object" && Object.keys(restoredAnswers).length > 0;
        if (savedAnswers && !hasRestoredAnswers) {
          try {
            const savedData = JSON.parse(savedAnswers);
            if (savedData.answers && typeof savedData.answers === 'object') {
              console.log("Loading saved answers:", savedData.answers);
              setAnswers(savedData.answers);
            }
          } catch (e) {
            console.error("Error loading saved answers:", e);
          }
        } else if (!hasRestoredAnswers) {
          // Try to load from API if we have a submission result
          // This handles the case where answers come from API response
          // We'll map questionId-based answers to our key format
          const mappedAnswers: Record<string, string> = {};
          const s: WritingSection[] = (t as any)?.sections || [];
          
          // Map answers by questionId to our key format
          s.forEach((section, sectionIndex) => {
            if (section.subParts) {
              section.subParts.forEach((subPart, subPartIndex) => {
                const key = `${sectionIndex}-${subPartIndex}-${subPart.id}`;
                // Check if subPart has questions with IDs that match API answers
                if (subPart.questions && subPart.questions.length > 0) {
                  const questionId = subPart.questions[0].id;
                  // Try to find answer by questionId in any saved data
                  // This will be populated if we get results from API
                  if ((t as any)?.answers) {
                    const apiAnswer = (t as any).answers.find((a: any) => a.questionId === questionId);
                    if (apiAnswer?.userAnswer) {
                      mappedAnswers[key] = apiAnswer.userAnswer;
                    }
                  }
                }
              });
            }
            if (section.questions) {
              section.questions.forEach((question, questionIndex) => {
                const key = `${sectionIndex}-${questionIndex}-${question.id}`;
                if ((t as any)?.answers) {
                  const apiAnswer = (t as any).answers.find((a: any) => a.questionId === question.id);
                  if (apiAnswer?.userAnswer) {
                    mappedAnswers[key] = apiAnswer.userAnswer;
                  }
                }
              });
            }
          });
          
          if (Object.keys(mappedAnswers).length > 0) {
            console.log("Loading answers from API response:", mappedAnswers);
            setAnswers(mappedAnswers);
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
    if (showPracticeModal) return;
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      // toast.error("Time is up! Test will be submitted automatically.");
      handleSubmit();
    }
  }, [timeLeft, showPracticeModal]);

  // Auto-save drafts (debounced)
  useEffect(() => {
    if (!testId) return;
    const t = setTimeout(() => {
      const answersData = {
        testId,
        answers,
        sections,
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem(`writing_answers_${testId}`, JSON.stringify(answersData));
    }, 1500);
    return () => clearTimeout(t);
  }, [answers, sections, testId]);

  useEffect(() => {
    if (!testId || !hasRestoredProgressRef.current) return;
    const snapshot: WritingProgressSnapshot = {
      currentSectionIndex,
      currentSubPartIndex,
      timeLeft,
      fontScale,
      showPracticeModal,
      practiceText,
      answers,
      updatedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
    } catch {}
  }, [
    testId,
    progressStorageKey,
    currentSectionIndex,
    currentSubPartIndex,
    timeLeft,
    fontScale,
    showPracticeModal,
    practiceText,
    answers,
  ]);

  // Scale fonts for the entire writing page (rem-based sizes)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (baseFontSizeRef.current === null) {
      baseFontSizeRef.current = root.style.fontSize || "";
    }
    root.style.fontSize = `${16 * fontScale}px`;
    return () => {
      if (baseFontSizeRef.current !== null) {
        root.style.fontSize = baseFontSizeRef.current;
      }
    };
  }, [fontScale]);

  const selectedSection = sections[currentSectionIndex];
  const subParts = selectedSection?.subParts || [];

  useEffect(() => {
    if (!sections.length) return;

    const safeSectionIndex = Math.min(Math.max(currentSectionIndex, 0), sections.length - 1);
    if (safeSectionIndex !== currentSectionIndex) {
      setCurrentSectionIndex(safeSectionIndex);
      return;
    }

    const section = sections[safeSectionIndex];
    const sectionSubParts = Array.isArray(section?.subParts) ? section.subParts : [];
    const sectionQuestions = Array.isArray(section?.questions) ? section.questions : [];
    const maxSubPartIndex =
      sectionSubParts.length > 0
        ? sectionSubParts.length - 1
        : Math.max(0, sectionQuestions.length - 1);
    const safeSubPartIndex = Math.min(Math.max(currentSubPartIndex, 0), maxSubPartIndex);
    if (safeSubPartIndex !== currentSubPartIndex) {
      setCurrentSubPartIndex(safeSubPartIndex);
    }
  }, [sections, currentSectionIndex, currentSubPartIndex]);
  
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
    const pos = prevIndex + 1;
    // Update DOM value immediately to keep caret position stable
    el.value = newValue;
    el.setSelectionRange(pos, pos);
    setAnswers((prev) => ({
      ...prev,
      [selectedQuestionId]: newValue,
    }));
    // Ensure caret stays after React re-render
    requestAnimationFrame(() => {
      el.setSelectionRange(pos, pos);
      el.focus();
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

  const insertPracticeChar = (ch: string) => {
    setPracticeText((prev) => prev + ch);
  };

  const handlePracticeShortcutKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key !== "=") return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) return;
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
    if (!replacement) return;
    e.preventDefault();
    const newValue = value.slice(0, prevIndex) + replacement + value.slice(end);
    const pos = prevIndex + 1;
    el.value = newValue;
    el.setSelectionRange(pos, pos);
    setPracticeText(newValue);
    requestAnimationFrame(() => {
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const sectionNavItems = useMemo(() => {
    const items: Array<{ label: string; sectionIndex: number; subPartIndex: number }> = [];
    sections.forEach((section, sectionIndex) => {
      if (section.subParts && section.subParts.length > 0) {
        section.subParts.forEach((_, subPartIndex) => {
          items.push({
            label: `${sectionIndex + 1}.${subPartIndex + 1}`,
            sectionIndex,
            subPartIndex,
          });
        });
      } else {
        items.push({ label: `${sectionIndex + 1}`, sectionIndex, subPartIndex: 0 });
      }
    });
    return items;
  }, [sections]);

  const renderKeyboard = () => {
  const turkishChars = [
  { char: "\u00C7", lower: "\u00E7", shortcut: "C=" },
  { char: "\u011E", lower: "\u011F", shortcut: "G=" },
  { char: "\u015E", lower: "\u015F", shortcut: "S=" },
  { char: "\u00D6", lower: "\u00F6", shortcut: "O=" },
  { char: "\u00DC", lower: "\u00FC", shortcut: "U=" },
  { char: "I", lower: "\u0131", shortcut: "i=" },
  { char: "\u0130", lower: "i", shortcut: "I=" },
  ];
  
  return (
  <div className="hidden lg:block mt-3 sm:mt-4">
  {showShortcuts && (
    <div className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
      <span className="font-semibold">T&#252;rk&#231;e Karakterler:</span>
      <span className="block">Harfin ard&#305;ndan <span className="font-semibold">=</span> tu&#351;una basarsan&#305;z T&#252;rk&#231;e karaktere d&#246;n&#252;&#351;&#252;r.</span>
      <span className="block">K&#305;sayollar: c=&#231;, g=&#287;, s=&#351;, o=&#246;, u=&#252;, i=&#305;, I=&#304;</span>
    </div>
  )}
  <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-md">
  {turkishChars.map(({ char, lower }) => (
  <div key={char} className="flex flex-col gap-1">
  <button
  type="button"
  onClick={() => insertChar(char)}
  className="h-9 sm:h-10 w-full border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-300 text-base sm:text-lg font-semibold text-gray-800 transition-colors flex items-center justify-center"
  >
  {char}
  </button>
  <button
  type="button"
  onClick={() => insertChar(lower)}
  className="h-7 sm:h-8 w-full border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-300 text-xs sm:text-sm font-medium text-gray-800 transition-colors flex items-center justify-center"
  >
  {lower}
  </button>
  </div>
  ))}
  </div>
  <div className="mt-2 text-[10px] sm:text-xs text-gray-500">
  Kopyala: Ctrl+C | Yap&#305;&#351;t&#305;r: Ctrl+V
  </div>
  </div>
  );
  };

  const renderPracticeKeyboard = () => {
    const turkishChars = [
      { char: "\u00C7", lower: "\u00E7", shortcut: "C=" },
      { char: "\u011E", lower: "\u011F", shortcut: "G=" },
      { char: "\u015E", lower: "\u015F", shortcut: "S=" },
      { char: "\u00D6", lower: "\u00F6", shortcut: "O=" },
      { char: "\u00DC", lower: "\u00FC", shortcut: "U=" },
      { char: "I", lower: "\u0131", shortcut: "i=" },
      { char: "\u0130", lower: "i", shortcut: "I=" },
    ];
    return (
      <div className="mt-3">
        <div className="text-xs sm:text-sm text-gray-700 mb-2">
          <span className="font-semibold">Türkçe Karakterler:</span>
          <span className="block">
            Harfin ardından <span className="font-semibold">=</span> tuşuna
            basarsanız Türkçe karaktere dönüşür.
          </span>
          <span className="block">Kısayollar: c=ç, g=ğ, s=ş, o=ö, u=ü, i=ı, I=İ</span>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-md">
          {turkishChars.map(({ char, lower }) => (
            <div key={char} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => insertPracticeChar(char)}
                className="h-9 sm:h-10 w-full border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-300 text-base sm:text-lg font-semibold text-gray-800 transition-colors flex items-center justify-center"
              >
                {char}
              </button>
              <button
                type="button"
                onClick={() => insertPracticeChar(lower)}
                className="h-7 sm:h-8 w-full border border-gray-300 rounded bg-white hover:bg-blue-50 hover:border-blue-300 text-xs sm:text-sm font-medium text-gray-800 transition-colors flex items-center justify-center"
              >
                {lower}
              </button>
            </div>
          ))}
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

  const renderWithBoldFirstParagraph = (
    text: string,
    baseClass: string
  ) => {
    const normalizedText = normalizeDisplayText(text);
    if (!normalizedText) return null;
    let paragraphs = normalizedText
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length <= 1) {
      const lineParagraphs = normalizedText
        .split(/\r?\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (lineParagraphs.length > 1) paragraphs = lineParagraphs;
    }

    if (paragraphs.length === 1) {
      const firstText = paragraphs[0];
      const firstColonIdx = firstText.indexOf(":");
      if (firstColonIdx > 0 && firstColonIdx < 220) {
        const intro = firstText.slice(0, firstColonIdx + 1).trim();
        const tail = firstText.slice(firstColonIdx + 1).trim();
        if (tail) paragraphs = [intro, tail];
      }
    }

    const first = paragraphs[0] ?? "";
    const rest = paragraphs.slice(1);
    const paragraphClass = `${baseClass} whitespace-pre-line text-left`;
    return (
      <div className="space-y-3">
        {first && (
          <p className={`${paragraphClass} font-semibold`}>
            {first}
          </p>
        )}
        {rest.map((p, idx) => (
          <p key={`${idx}-${p.slice(0, 12)}`} className={paragraphClass}>
            {p}
          </p>
        ))}
      </div>
    );
  };

  const renderPlainParagraphs = (text: string, baseClass: string) => {
    const normalizedText = normalizeDisplayText(text);
    if (!normalizedText) return null;
    const splitByBlank = normalizedText
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const paragraphs =
      splitByBlank.length > 1
        ? splitByBlank
        : normalizedText
            .split(/\r?\n+/)
            .map((p) => p.trim())
            .filter(Boolean);
    const paragraphClass = `${baseClass} whitespace-pre-line text-left`;
    return (
      <div className="space-y-3">
        {paragraphs.map((p, idx) => (
          <p key={`${idx}-${p.slice(0, 12)}`} className={paragraphClass}>
            {p}
          </p>
        ))}
      </div>
    );
  };

  const currentAnswer = answers[selectedQuestionId] || "";
  console.log("Current answer for selectedQuestionId:", selectedQuestionId, "is:", currentAnswer);
  console.log("All answers:", answers);
  const wordCount = getWordCount(currentAnswer);
  const wordLimit = getWordLimit();
  // const wordsRemaining = Math.max(0, wordLimit - wordCount);
  const isOverLimit = wordCount > wordLimit;

  const clearWritingProgress = () => {
    try { sessionStorage.removeItem(progressStorageKey); } catch {}
  };

  const handleSubmit = async () => {
    if (!testId || submitting) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
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
        if (nextPath !== "/overall-section-ready" && typeof document !== "undefined") {
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
        clearWritingProgress();
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
      clearWritingProgress();
      navigate(`/writing-test/results/temp`, { state: { summary: { testId: testId } } });
      setSubmitting(false);
    } catch (error) {
      console.error("Writing navigation error:", error);
      toast.error(buildSubmitRetryMessage(error, "Test gecisinde hata olustu"));
      setSubmitting(false);
    }
  };

  const submitAllTests = async (overallId: string) => {
    try {
      // toast.info("Submitting all tests...");
      
      // Submit all individual tests first
      const { readingSubmissionService } = await import("@/services/readingTest.service");
      const { listeningSubmissionService } = await import("@/services/listeningTest.service");
      const { writingSubmissionService } = await import("@/services/writingSubmission.service");
      const { speakingSubmissionService } = await import("@/services/speakingSubmission.service");
      const { overallTestTokenStore } = await import("@/services/overallTest.service");
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          const rawReadingAnswers = readingData.answers;
          const payload = Array.isArray(rawReadingAnswers)
            ? rawReadingAnswers.map((item: any) => ({
                questionId: String(item?.questionId ?? ""),
                userAnswer: String(item?.userAnswer ?? ""),
              }))
            : Object.entries(rawReadingAnswers || {}).map(([questionId, userAnswer]) => ({
                questionId,
                userAnswer: String(userAnswer),
              }));
          const sanitizedPayload = payload.filter((item) => item.questionId);
          
          // Bu testin genel test akışının parçası olup olmadığını kontrol et
          const { overallTestTokenStore } = await import("@/services/overallTest.service");
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          
          if (!overallToken) {
            console.log("⚠️ Okuma testi genel token'siz, standart auth ile devam ediliyor");
          }
          await readingSubmissionService.submitAnswers(
            readingData.testId,
            sanitizedPayload,
            overallToken || undefined
          );
          try { sessionStorage.removeItem(key); } catch {}
        }
      }
      
      // Dinleme testini gönder - herhangi bir testten dinleme cevaplarını ara
      const listeningAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('listening_answers_'));
      for (const key of listeningAnswersKeys) {
        const listeningAnswers = sessionStorage.getItem(key);
        if (listeningAnswers) {
          const listeningData = JSON.parse(listeningAnswers);
          const rawListeningAnswers = listeningData.answers;
          const payload = Array.isArray(rawListeningAnswers)
            ? rawListeningAnswers.map((item: any) => ({
                questionId: String(item?.questionId ?? ""),
                userAnswer: String(item?.userAnswer ?? ""),
              }))
            : Object.entries(rawListeningAnswers || {}).map(([questionId, userAnswer]) => ({
                questionId,
                userAnswer: String(userAnswer),
              }));
          const sanitizedPayload = payload.filter((item) => item.questionId);
          
          // Bu testin genel test akışının parçası olup olmadığını kontrol et
          const { overallTestTokenStore } = await import("@/services/overallTest.service");
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          
          if (!overallToken) {
            console.log("⚠️ Dinleme testi genel token'siz, standart auth ile devam ediliyor");
          }
          await listeningSubmissionService.submitAnswers(
            listeningData.testId, 
            sanitizedPayload,
            overallToken || undefined,
            listeningData.audioUrl,
            listeningData.imageUrls
          );
          try { sessionStorage.removeItem(key); } catch {}
        }
      }
      
      // Yazma testlerini gönder
      const writingAnswersKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("writing_answers_"));
      for (const key of writingAnswersKeys) {
        const writingAnswers = sessionStorage.getItem(key);
        if (!writingAnswers) continue;

        const writingData = JSON.parse(writingAnswers);
        const overallToken = overallTestTokenStore.getByTestId(writingData.testId);
        const getWritingAnswer = (
          questionId: string,
          sectionIndex: number,
          fallbackId?: string,
          itemIndex?: number
        ) => {
          const direct = writingData.answers?.[questionId];
          if (typeof direct === "string") return direct;
          const fallback = typeof fallbackId === "string" ? fallbackId : "";
          const idx = typeof itemIndex === "number" ? String(itemIndex) : "";
          const keys = [
            `${sectionIndex}-${questionId}`,
            `${sectionIndex}-${fallback}`,
            fallback,
            idx && fallback ? `${sectionIndex}-${idx}-${fallback}` : "",
            idx ? `${sectionIndex}-${idx}-${questionId}` : "",
          ].filter(Boolean);
          for (const k of keys) {
            const v = writingData.answers?.[k];
            if (typeof v === "string") return v;
          }
          return "";
        };

        const payload = {
          writingTestId: writingData.testId,
          sections: (writingData.sections || []).map((section: any, sectionIndex: number) => {
            const sectionDescription =
              (typeof section?.title === "string" && section.title.trim()) ||
              (typeof section?.description === "string" && section.description.trim()) ||
              `Section ${section?.order || sectionIndex + 1}`;
            const sectionData: any = {
              description: sectionDescription,
            };

            if (Array.isArray(section.subParts) && section.subParts.length > 0) {
              sectionData.subParts = section.subParts.map((subPart: any, subPartIndex: number) => {
                const questions = Array.isArray(subPart.questions) ? subPart.questions : [];
                const subPartDescription =
                  (typeof subPart?.label === "string" && subPart.label.trim()) ||
                  (typeof subPart?.description === "string" && subPart.description.trim()) ||
                  `Sub Part ${subPart?.order || subPartIndex + 1}`;
                const answersArr = questions
                  .map((q: any) => {
                    const rawQuestionId = q?.id || q?.questionId;
                    const qid =
                      typeof rawQuestionId === "string"
                        ? rawQuestionId
                        : String(rawQuestionId || "").trim();
                    if (!qid) return null;
                    return { questionId: qid, userAnswer: getWritingAnswer(qid, sectionIndex, subPart?.id, subPartIndex) };
                  })
                  .filter(Boolean);
                return {
                  description: subPartDescription,
                  answers: answersArr,
                };
              });
            }

            if (Array.isArray(section.questions) && section.questions.length > 0) {
              sectionData.answers = section.questions
                .map((q: any, questionIndex: number) => {
                  const rawQuestionId = q?.id || q?.questionId;
                  const qid =
                    typeof rawQuestionId === "string"
                      ? rawQuestionId
                      : String(rawQuestionId || "").trim();
                  if (!qid) return null;
                  return { questionId: qid, userAnswer: getWritingAnswer(qid, sectionIndex, section?.id, questionIndex) };
                })
                .filter(Boolean);
            }

            return sectionData;
          }),
        };
        if (overallToken) {
          (payload as any).sessionToken = overallToken;
        }
        const writingResult = await writingSubmissionService.create(payload as any);
        if (!writingResult) {
          throw new Error(`Writing submit-all failed: ${writingData.testId}`);
        }
        try { sessionStorage.removeItem(key); } catch {}
      }
      
      // Submit speaking test - look for speaking answers from any test
      const speakingAnswersKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("speaking_answers_"));
      for (const key of speakingAnswersKeys) {
        const speakingAnswers = sessionStorage.getItem(key);
        if (!speakingAnswers) continue;

        const speakingData = JSON.parse(speakingAnswers);
        const answerTextRecord: Record<string, string> = {};
        const isMeaningfulText = (value: unknown) => {
          if (typeof value !== "string") return false;
          const trimmed = value.trim();
          return (
            trimmed.length > 0 &&
            trimmed !== "[Cevap bulunamadı]" &&
            trimmed !== "[Ses metne dönüştürülemedi]"
          );
        };

        if (speakingData.transcripts && typeof speakingData.transcripts === "object") {
          for (const [qid, t] of Object.entries(speakingData.transcripts)) {
            if (isMeaningfulText(t)) answerTextRecord[qid] = String(t).trim();
          }
        }

        if (speakingData.answers && typeof speakingData.answers === "object") {
          for (const [qid, val] of Object.entries(speakingData.answers)) {
            const maybeObj: any = val;
            const text = typeof val === "string" ? val : maybeObj?.text;
            if (isMeaningfulText(text)) {
              answerTextRecord[qid] = String(text).trim();
            }
          }
        }

        const formattedSubmission = speakingSubmissionService.formatSubmissionData(
          speakingData,
          answerTextRecord
        );
        const overallToken = overallTestTokenStore.getByTestId(speakingData.testId);
        if (overallToken) {
          formattedSubmission.sessionToken = overallToken;
        } else {
          console.warn(
            "Speaking submit-all without overall token; falling back to standard auth:",
            speakingData.testId
          );
        }

        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          throw new Error(`Speaking submit-all invalid payload: ${speakingData.testId}`);
        }

        const submissionResult = await speakingSubmissionService.submitSpeakingTest(formattedSubmission);
        if (!submissionResult.success) {
          throw new Error(`Speaking submit-all failed: ${String(submissionResult.error || "unknown error")}`);
        }

        try {
          sessionStorage.removeItem(key);
        } catch {}
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
      submitAllRetryRef.current = 0;
      clearWritingProgress();
      navigate(`/overall-results/${overallId}`);
    } catch (error) {
      console.error("Error submitting all tests:", error);
      if (submitAllRetryRef.current < 1) {
        submitAllRetryRef.current += 1;
        toast.message("Gonderim tekrar deneniyor. Cevaplariniz saklandi.");
        await new Promise((resolve) => setTimeout(resolve, 1400));
        return await submitAllTests(overallId);
      }
      submitAllRetryRef.current = 0;
      toast.error(buildSubmitRetryMessage(error, "Testler gonderilirken hata olustu"));
      setSubmitting(false);
      return;
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
          <p className="mt-4 text-gray-600">Test yükleniyor...</p>
        </div>
      </div>
    );
  }


  return (
    <div
      className="min-h-screen bg-white"
      style={{
        WebkitOverflowScrolling: 'touch',
        overflowY: 'auto',
        height: '100vh',
        ["--writing-font-scale" as any]: fontScale,
      }}
    >
      {/* Header - Same height and logic as reading navbar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
        {/* Match horizontal padding with description block below */}
        <div className="px-2 sm:px-4">
          <div className="flex justify-between items-center h-20 sm:h-24">
            {/* Mobile Header - Single Line Layout */}
            <div className="block lg:hidden w-full">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-base sm:text-lg tracking-wider">YAZMA</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-8 w-8 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      onClick={() => setFontScale((v) => Math.max(0.9, Math.round((v - 0.05) * 100) / 100))}
                      aria-label="Metni küçült"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      className="h-8 w-8 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      onClick={() => setFontScale((v) => Math.min(1.2, Math.round((v + 0.05) * 100) / 100))}
                      aria-label="Metni büyült"
                    >
                      A+
                    </button>
                  </div>
                  <div
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-bold ${
                      timeLeft <= 300
                        ? "bg-red-50 border-red-200 text-red-700"
                        : timeLeft <= 600
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-slate-700"
                    }`}
                  >
                    <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                  <Button onClick={() => setShowSubmitModal(true)} className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold min-h-[44px] touch-manipulation">
                    GÖNDER
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Header - Horizontal Layout */}
            <div className="hidden lg:flex items-center justify-between w-full">
              <div className="flex items-center">
                <img 
                  src="/logo11.svg" 
                  alt="TURKISHMOCK" 
                  className="h-10 sm:h-11 md:h-12 w-auto object-contain"
                  onError={(e) => {
                    console.error("Logo failed to load");
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="font-bold text-2xl">YAZMA</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="h-9 w-9 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                    onClick={() => setFontScale((v) => Math.max(0.9, Math.round((v - 0.05) * 100) / 100))}
                    aria-label="Metni küçült"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    className="h-9 w-9 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                    onClick={() => setFontScale((v) => Math.min(1.2, Math.round((v + 0.05) * 100) / 100))}
                    aria-label="Metni büyült"
                  >
                    A+
                  </button>
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${
                    timeLeft <= 300
                      ? "bg-red-50 border-red-200 text-red-700"
                      : timeLeft <= 600
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-gray-50 border-gray-200 text-slate-700"
                  }`}
                >
                  <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">{formatTime(timeLeft)}</span>
                </div>
                <Button onClick={() => setShowSubmitModal(true)} className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 text-sm font-bold min-h-[44px] touch-manipulation">
                  GÖNDER
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Tabs - Below header */}
      <div className="px-2 sm:px-4 pt-2"></div>

      {/* Main Content - Scrollable - Closer to header */}
      <div className="flex-1 p-3 sm:p-4 pt-4 sm:pt-6 lg:pt-6 lg:p-8 pb-32 sm:pb-36">
        <div className="max-w-8xl mx-auto">
          {/* Mobile Layout - Questions on top */}
          <div className="lg:hidden space-y-3 sm:space-y-4">
            {sectionNavItems.length > 1 && (
              <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-200">
                {sectionNavItems.map((item) => {
                  const isActive =
                    item.sectionIndex === currentSectionIndex &&
                    item.subPartIndex === currentSubPartIndex;
                  return (
                    <button
                      key={`mobile-${item.sectionIndex}-${item.subPartIndex}`}
                      type="button"
                      onClick={() => {
                        setCurrentSectionIndex(item.sectionIndex);
                        setCurrentSubPartIndex(item.subPartIndex);
                      }}
                      className={`px-5 py-2 min-w-[70px] rounded-full text-base font-semibold transition-colors border ${
                        isActive
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-white text-[#333333] border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Questions Panel - Mobile Only - Scrollable */}
            <div className="bg-transparent p-0 max-h-[45vh] overflow-y-auto text-[#333333]" style={{ WebkitOverflowScrolling: 'touch', fontSize: `calc(1rem * var(--writing-font-scale, 1))` }}>
              {(selectedSection?.description || hasQuestions || (hasSubParts && selectedSubPart)) && (
                <div className="space-y-3 text-gray-700">
                  {selectedSection?.description && (
                    <div className="p-0 rounded-none bg-transparent border-0">
                      {renderWithBoldFirstParagraph(
                        selectedSection.description,
                        "text-base text-gray-700"
                      )}
                    </div>
                  )}
                  {hasSubParts && selectedSubPart && (
                    <div className="p-4 rounded-lg bg-[#FEFEFC] border border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-2 text-base">
                        {normalizeDisplayText(selectedSubPart.label) ||
                          `Bölüm ${currentSubPartIndex + 1}`}
                      </h3>
                      {selectedSubPart.question && (
                        renderPlainParagraphs(
                          selectedSubPart.question,
                          "text-base text-gray-600"
                        )
                      )}
                      {selectedSubPart.description && (
                        <div className="mt-1">
                          {renderPlainParagraphs(
                            selectedSubPart.description,
                            "text-xs text-gray-600"
                          )}
                        </div>
                      )}
                      {!selectedSubPart.question &&
                        !selectedSubPart.description &&
                        selectedSubPart.questions &&
                        selectedSubPart.questions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {selectedSubPart.questions.map((question: any) => (
                              <div
                                key={question.id}
                                className="p-0"
                              >
                                {renderPlainParagraphs(
                                  question.text,
                                  "text-base text-gray-800"
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                  {hasQuestions && !hasSubParts && (
                      <div className="space-y-3">
                          {questions.map((question, _idx) => (
                        <div
                          key={question.id}
                          className="p-4 rounded-lg bg-[#FEFEFC] border border-gray-200"
                        >
                          {question.text && (
                            renderPlainParagraphs(
                              question.text,
                              "text-base text-gray-700"
                            )
                          )}
                          {"question" in question && (question as any).question && (
                            renderPlainParagraphs(
                              (question as any).question,
                              "text-base text-gray-700"
                            )
                          )}
                          {"description" in question && (question as any).description && (
                            <div className="mt-1">
                              {renderPlainParagraphs(
                                (question as any).description,
                                "text-xs text-gray-600"
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Writing Area - Mobile Only - Always Visible */}
            <div className="bg-[#F7F7F5] rounded-xl shadow-sm p-3 sm:p-4 mt-0 mb-20 relative z-10 border border-gray-200">
              <div className="mb-2">
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  Cevabınızı yazın:
                </label>
              </div>
              <div className="flex flex-wrap gap-2 mb-3 text-xs">
              </div>
              <textarea
                ref={textareaRef}
                onKeyDown={handleShortcutKeyDown}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Yazınızı buraya yazın.."
                disabled={showPracticeModal}
                className="w-full h-80 sm:h-96 p-3 sm:p-4 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#438553] focus:border-[#438553] text-gray-900 placeholder:text-gray-400 text-sm sm:text-base overflow-y-auto bg-[#FEFEFC] disabled:opacity-60 disabled:cursor-not-allowed"
                dir="ltr"
                lang="tr"
                style={{ 
                  WebkitAppearance: 'none',
                  touchAction: 'manipulation',
                  minHeight: '320px',
                  maxHeight: '900px',
                  WebkitOverflowScrolling: 'touch',
                  fontSize: `calc(1rem * var(--writing-font-scale, 1))`,
                  lineHeight: `calc(1.6 * var(--writing-font-scale, 1))`,
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold">
                  {hasSubParts ? (currentSubPartIndex === 0 ? "Bölüm 1.1" : "Bölüm 1.2") : "Bölüm 2"}
                </div>
                <div className={`text-xs sm:text-sm font-semibold ${isOverLimit ? "text-red-600" : "text-gray-600"}`}>
                  {wordCount}/{wordLimit} kelime
                </div>
              </div>
              {renderKeyboard()}
            </div>
          </div>
          {/* Mobile Bottom Section Navigation */}
          {sectionNavItems.length > 1 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-3 py-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                {sectionNavItems.map((item) => {
                  const isActive =
                    item.sectionIndex === currentSectionIndex &&
                    item.subPartIndex === currentSubPartIndex;
                  return (
                    <button
                      key={`mobile-bottom-${item.sectionIndex}-${item.subPartIndex}`}
                      type="button"
                      onClick={() => {
                        setCurrentSectionIndex(item.sectionIndex);
                        setCurrentSubPartIndex(item.subPartIndex);
                      }}
                      className={`px-4 py-2 min-w-[64px] rounded-full text-sm font-semibold transition-colors border ${
                        isActive
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-white text-[#333333] border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desktop Layout - Questions left, textarea right, with shadcn resizable */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="w-full">
              <ResizablePanel defaultSize={45} minSize={25} maxSize={60} className="min-w-0">
                <div className="bg-[#F7F7F5] rounded-xl shadow-sm p-6 flex flex-col justify-start h-[calc(100vh-140px)] overflow-y-auto border border-gray-200 text-[#333333]" style={{ fontSize: `calc(1rem * var(--writing-font-scale, 1))` }}>
                  {sectionNavItems.length > 1 && (
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-200">
                      {sectionNavItems.map((item) => {
                        const isActive =
                          item.sectionIndex === currentSectionIndex &&
                          item.subPartIndex === currentSubPartIndex;
                        return (
                          <button
                            key={`${item.sectionIndex}-${item.subPartIndex}`}
                            type="button"
                            onClick={() => {
                              setCurrentSectionIndex(item.sectionIndex);
                              setCurrentSubPartIndex(item.subPartIndex);
                            }}
                            className={`px-5 py-2 min-w-[70px] rounded-full text-base font-semibold transition-colors border ${
                              isActive
                                ? "bg-red-500 text-white border-red-500"
                                : "bg-white text-[#333333] border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Questions Display - Always show */}
                  {questions.length > 0 && !hasSubParts && (
                    <div className="space-y-4 mt-4">
                      {questions.map((question, _idx) => (
                        <div key={question.id} className="p-4 rounded-lg bg-[#FEFEFC] border border-gray-200">
                          {question.text && (
                            renderPlainParagraphs(
                              question.text,
                              "text-lg text-[#333333]"
                            )
                          )}
                          {"question" in question && (question as any).question && (
                            renderPlainParagraphs(
                              (question as any).question,
                              "text-lg text-[#333333]"
                            )
                          )}
                          {"description" in question && (question as any).description && (
                            <div className="mt-2">
                              {renderPlainParagraphs(
                                (question as any).description,
                                "text-base text-gray-600"
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSection?.description && (
                    <div className="space-y-4 text-[#333333] mt-4">
                      <div className="p-0 rounded-none bg-transparent border-0">
                        {renderWithBoldFirstParagraph(
                          selectedSection.description,
                          "text-lg text-[#333333]"
                        )}
                      </div>
                      {hasSubParts && selectedSubPart && (
                        <div className="p-4 rounded-lg bg-[#FEFEFC] border border-gray-200">
                          <h3 className="font-medium text-gray-900 mb-2 text-lg">
                            {normalizeDisplayText(selectedSubPart.label) || `Bölüm ${currentSubPartIndex + 1}`}
                          </h3>
                          {selectedSubPart.question && (
                            renderPlainParagraphs(
                              selectedSubPart.question,
                              "text-lg text-gray-600"
                            )
                          )}
                          {selectedSubPart.description && (
                            <div className="mt-2">
                              {renderPlainParagraphs(
                                selectedSubPart.description,
                                "text-base text-gray-600"
                              )}
                            </div>
                          )}
                          {!selectedSubPart.question &&
                            !selectedSubPart.description &&
                            selectedSubPart.questions &&
                            selectedSubPart.questions.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {selectedSubPart.questions.map((question: any) => (
                                  <div key={question.id} className="p-0">
                                    {renderPlainParagraphs(
                                      question.text,
                                      "text-lg text-[#333333]"
                                    )}
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
              <ResizableHandle className="bg-gray-200 w-px" />
              <ResizablePanel defaultSize={55} className="min-w-0">
                <div className="bg-[#F7F7F5] rounded-xl shadow-sm p-6 flex-1 min-w-0 h-[calc(100vh-140px)] overflow-y-auto flex flex-col border border-gray-200 text-[#333333]">
                  <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  </div>
                  <textarea
                    ref={textareaRef}
                    onKeyDown={handleShortcutKeyDown}
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Yazınızı buraya yazın.."
                    disabled={showPracticeModal}
                    className="w-full min-h-[300px] h-auto flex-1 p-6 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#438553] focus:border-[#438553] text-gray-900 placeholder:text-gray-400 text-lg bg-[#FEFEFC] disabled:opacity-60 disabled:cursor-not-allowed"
                    dir="ltr"
                    lang="tr"
                    style={{
                      fontSize: `calc(1.125rem * var(--writing-font-scale, 1))`,
                      lineHeight: `calc(1.65 * var(--writing-font-scale, 1))`,
                    }}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold">
                      {hasSubParts ? (currentSubPartIndex === 0 ? "Bölüm 1.1" : "Bölüm 1.2") : "Bölüm 2"}
                    </div>
                    <div className={`text-sm font-semibold ${isOverLimit ? "text-red-600" : "text-gray-600"}`}>
                      {wordCount}/{wordLimit} kelime
                    </div>
                  </div>
                  {renderKeyboard()}

                </div>
              </ResizablePanel>
            </ResizablePanelGroup>


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

      {/* Practice Modal - Before Start */}
      {showPracticeModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Pratik Alanı
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Yazmaya başlamadan önce Türkçe karakterleri deneyebilirsiniz.
                Süre şu anda durduruldu.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={practiceText}
                onChange={(e) => setPracticeText(e.target.value)}
                onKeyDown={handlePracticeShortcutKeyDown}
                placeholder="Buraya yazarak pratik yapabilirsiniz..."
                className="w-full min-h-[180px] p-4 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#438553] focus:border-[#438553] text-gray-900 placeholder:text-gray-400"
              />
              {renderPracticeKeyboard()}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button
                onClick={() => setShowPracticeModal(false)}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 text-sm font-bold"
              >
                Hazırım, Başla
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
