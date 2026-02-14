import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import writingSubmissionService from "@/services/writingSubmission.service";
import { overallTestService, overallTestFlowStore } from "@/services/overallTest.service";
import { normalizeDisplayText, normalizeFeedbackText } from "@/utils/text";

// interface TestResult {
//   id: string;
//   score?: number;
//   aiFeedback?: {
//     taskAchievement: string;
//     coherenceAndCohesion: string;
//     lexicalResource: string;
//     grammaticalRangeAndAccuracy: string;
//   };
//   submittedAt?: string;
//   createdAt?: string;
//   updatedAt?: string;
//   userId: string;
//   writingTestId: string;
// }

export default function WritingTestResults() {
  console.log("WritingTestResults component loaded with NEW UI");
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState("task2");
  const [activeTask1Part, setActiveTask1Part] = useState("part1");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    // Try to get overall test result ID from session storage, otherwise use individual result ID
    const overallId = overallTestFlowStore.getOverallId() || resultId;
    if (!overallId) return;
    
    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(overallId, `writing-certificate-${overallId}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    if (!resultId) {
      navigate("/test");
      return;
    }

    const loadResult = async () => {
      try {
        const data = await writingSubmissionService.getById(resultId);
        setResult(data);
      } catch (error) {
        console.error("Error loading result:", error);
        navigate("/test");
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [resultId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">SonuÃ§lar yÃ¼kleniyor...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">SonuÃ§ bulunamadÄ±</p>
          <Button onClick={() => navigate("/test")} className="mt-4">
            Testlere DÃ¶n
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from the result structure
  const writingData = result.writing || result;
  const rawAiFeedback =
    writingData?.aiFeedback ??
    writingData?.ai_feedback ??
    writingData?.feedback ??
    writingData?.assessment ??
    null;
  const aiFeedback =
    rawAiFeedback && typeof rawAiFeedback === "object"
      ? rawAiFeedback?.aiFeedback ??
        rawAiFeedback?.ai_feedback ??
        rawAiFeedback?.feedback ??
        rawAiFeedback?.assessment ??
        rawAiFeedback
      : rawAiFeedback;
  // Bullet cleanup + Turkish text normalization + repeated sentence dedupe
  const removeBullets = (text: string | undefined | null) => {
    if (!text) return "";
    const stripped = text
      .replace(/[•\u2022\u25CF\u25E6\u25A0\u25AA\uF0B7]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalizeFeedbackText(stripped);
  };

  const pickFirstText = (...values: any[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return normalizeFeedbackText(value.trim());
      }
    }
    return undefined;
  };

  const extractSectionNarrative = (section: any): string | undefined => {
    if (!section || typeof section !== "object") return undefined;
    return pickFirstText(
      section.degerlendirme,
      section["deÄŸerlendirme"],
      section.feedback,
      section.yorum,
      section.text,
      section.analysis
    );
  };

  const extractCriteriaValue = (sources: any[], keys: string[]): string | undefined => {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      for (const key of keys) {
        const candidate = source[key];
        if (typeof candidate === "string" && candidate.trim()) {
          return normalizeFeedbackText(candidate.trim());
        }
      }
    }
    return undefined;
  };

  // Parse AI feedback string to extract sections
  const parseAIFeedback = () => {
    const feedback = aiFeedback;
    if (!feedback) return null;

    // If feedback is an object, normalize common backend shapes
    if (typeof feedback === 'object' && feedback !== null) {
      const feedbackObj: any = feedback;
      const bolumler =
        feedbackObj?.bolumler ??
        feedbackObj?.["bÃ¶lÃ¼mler"] ??
        feedbackObj?.sections ??
        feedbackObj?.parts ??
        {};

      const bolum11 =
        bolumler?.bolum_1_1 ??
        bolumler?.["bÃ¶lÃ¼m_1_1"] ??
        feedbackObj?.bolum_1_1 ??
        feedbackObj?.["bÃ¶lÃ¼m_1_1"];
      const bolum12 =
        bolumler?.bolum_1_2 ??
        bolumler?.["bÃ¶lÃ¼m_1_2"] ??
        feedbackObj?.bolum_1_2 ??
        feedbackObj?.["bÃ¶lÃ¼m_1_2"];
      const bolum2 =
        bolumler?.bolum_2 ??
        bolumler?.["bÃ¶lÃ¼m_2"] ??
        feedbackObj?.bolum_2 ??
        feedbackObj?.["bÃ¶lÃ¼m_2"];

      const criteriaSources = [
        feedbackObj?.kriterler,
        feedbackObj?.criteria,
        bolum2?.kriterler,
        bolum2?.criteria,
        bolum12?.kriterler,
        bolum12?.criteria,
        bolum11?.kriterler,
        bolum11?.criteria,
      ];

      return {
        ...feedbackObj,
        part1_1: pickFirstText(
          feedbackObj?.part1_1,
          feedbackObj?.part1,
          extractSectionNarrative(bolum11)
        ),
        part1_2: pickFirstText(
          feedbackObj?.part1_2,
          extractSectionNarrative(bolum12)
        ),
        part2: pickFirstText(
          feedbackObj?.part2,
          feedbackObj?.part_2,
          extractSectionNarrative(bolum2)
        ),
        general: pickFirstText(
          feedbackObj?.general,
          feedbackObj?.generalFeedback,
          feedbackObj?.genel_degerlendirme,
          feedbackObj?.genelDegerlendirme,
          feedbackObj?.egitmen_notu,
          feedbackObj?.egitmenNotu,
          feedbackObj?.teacher_note,
          feedbackObj?.teacherNote,
          feedbackObj?.summary
        ),
        coherenceAndCohesion: pickFirstText(
          feedbackObj?.coherenceAndCohesion,
          extractCriteriaValue(criteriaSources, [
            "coherenceAndCohesion",
            "coherence_and_cohesion",
            "tutarlilikVeBaglilik",
            "tutarlilik_ve_baglilik",
            "TutarlÄ±lÄ±k ve BaÄŸlÄ±lÄ±k",
            "TutarlÄ±lÄ±k"
          ])
        ),
        grammaticalRangeAndAccuracy: pickFirstText(
          feedbackObj?.grammaticalRangeAndAccuracy,
          extractCriteriaValue(criteriaSources, [
            "grammaticalRangeAndAccuracy",
            "grammatical_range_and_accuracy",
            "dilBilgisi",
            "dil_bilgisi",
            "Dil Bilgisi"
          ])
        ),
        lexicalResource: pickFirstText(
          feedbackObj?.lexicalResource,
          extractCriteriaValue(criteriaSources, [
            "lexicalResource",
            "lexical_resource",
            "kelimeKaynagi",
            "kelime_kaynagi",
            "Kelime KaynaÄŸÄ±"
          ])
        ),
        taskAchievement: pickFirstText(
          feedbackObj?.taskAchievement,
          extractCriteriaValue(criteriaSources, [
            "taskAchievement",
            "task_achievement",
            "gorevBasarisi",
            "gorev_basarisi",
            "gorevYaniti",
            "gorev_yaniti",
            "GÃ¶rev BaÅŸarÄ±sÄ±",
            "GÃ¶rev YanÄ±tÄ±"
          ])
        ),
      };
    }

    // If feedback is a string, parse it
    if (typeof feedback === 'string') {
      const parsed: any = {};

      // Extract GÃ–REV 1.1 section
      const task1_1Match = feedback.match(/\[GÃ–REV 1\.1 DEÄERLENDÄ°RMESÄ°\]([\s\S]*?)(?=\[GÃ–REV 1\.2|\[BÃ–LÃœM 2|AI GERÄ° BÄ°LDÄ°RÄ°MÄ°|$)/i);
      if (task1_1Match) {
        parsed.part1_1 = removeBullets(task1_1Match[1].trim());
      }

      // Extract GÃ–REV 1.2 section
      const task1_2Match = feedback.match(/\[GÃ–REV 1\.2 DEÄERLENDÄ°RMESÄ°\]([\s\S]*?)(?=\[BÃ–LÃœM 2|AI GERÄ° BÄ°LDÄ°RÄ°MÄ°|$)/i);
      if (task1_2Match) {
        parsed.part1_2 = removeBullets(task1_2Match[1].trim());
      }

      // Extract BÃ–LÃœM 2 section
      const part2Match = feedback.match(/\[BÃ–LÃœM 2 DEÄERLENDÄ°RMESÄ°\]([\s\S]*?)(?=AI GERÄ° BÄ°LDÄ°RÄ°MÄ°|$)/i);
      if (part2Match) {
        parsed.part2 = removeBullets(part2Match[1].trim());
      }

      // Extract AI GERÄ° BÄ°LDÄ°RÄ°MÄ° (EÄÄ°TMEN NOTU) section
      const generalMatch = feedback.match(/AI GERÄ° BÄ°LDÄ°RÄ°MÄ° \(EÄÄ°TMEN NOTU\):([\s\S]*?)(?=$)/i);
      if (generalMatch) {
        parsed.general = removeBullets(generalMatch[1].trim());
      }

      // Extract individual criteria from each section
      const extractCriteria = (text: string) => {
        const criteria: any = {};
        
        // Extract TutarlÄ±lÄ±k
        const coherenceMatch = text.match(/TutarlÄ±lÄ±k[:\s]*([^\nâ€¢]*)/i);
        if (coherenceMatch) {
          criteria.coherenceAndCohesion = coherenceMatch[1].trim();
        }
        
        // Extract Dil Bilgisi
        const grammarMatch = text.match(/Dil Bilgisi[:\s]*([^\nâ€¢]*)/i);
        if (grammarMatch) {
          criteria.grammaticalRangeAndAccuracy = grammarMatch[1].trim();
        }
        
        // Extract Kelime KaynaÄŸÄ±
        const lexicalMatch = text.match(/Kelime KaynaÄŸÄ±[:\s]*([^\nâ€¢]*)/i);
        if (lexicalMatch) {
          criteria.lexicalResource = lexicalMatch[1].trim();
        }
        
        // Extract GÃ¶rev BaÅŸarÄ±sÄ±
        const taskMatch = text.match(/GÃ¶rev BaÅŸarÄ±sÄ±[:\s]*([^\nâ€¢]*)/i);
        if (taskMatch) {
          criteria.taskAchievement = taskMatch[1].trim();
        }
        
        return criteria;
      };

      // Extract criteria from the full feedback text
      const allCriteria = extractCriteria(feedback);
      Object.assign(parsed, allCriteria);

      return parsed;
    }

    return null;
  };

  const parsedFeedback = parseAIFeedback();
  const scoreRaw =
    (writingData as any)?.score ??
    (result as any)?.score ??
    (parsedFeedback as any)?.ham_puan ??
    (aiFeedback as any)?.ham_puan ??
    0;
  const score = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw) || 0;
  const normalizeLevel = (raw?: string | null) => {
    if (!raw) return undefined;
    const value = String(raw).trim().toUpperCase();
    if (value === "A0" || value === "B1_ALTI" || value === "B1 ALTI") return "B1 altÄ±";
    return value;
  };
  const levelFromScore = (value: number) => {
    if (value >= 65) return "C1";
    if (value >= 51) return "B2";
    if (value >= 38) return "B1";
    return "B1 altÄ±";
  };
  const resolvedLevel =
    normalizeLevel(
      (writingData as any)?.level ??
      (result as any)?.level ??
      (parsedFeedback as any)?.level ??
      (aiFeedback as any)?.level
    ) || levelFromScore(score);

  const getSectionScore = (key: "bolum_1_1" | "bolum_1_2" | "bolum_2") => {
    const fromObject =
      (typeof aiFeedback === "object" && aiFeedback?.bolumler?.[key]?.puan) ||
      (typeof (parsedFeedback as any)?.bolumler === "object" && (parsedFeedback as any)?.bolumler?.[key]?.puan);
    if (typeof fromObject === "number") return fromObject;
    return null;
  };

  const getSectionCriteria = (key: "bolum_1_1" | "bolum_1_2" | "bolum_2") => {
    const source =
      (typeof aiFeedback === "object" && aiFeedback?.bolumler?.[key]) ||
      (typeof (parsedFeedback as any)?.bolumler === "object" && (parsedFeedback as any)?.bolumler?.[key]);
    if (source?.kriterler && typeof source.kriterler === "object") {
      return {
        coherence: source.kriterler.coherenceAndCohesion,
        grammar: source.kriterler.grammaticalRangeAndAccuracy,
        lexical: source.kriterler.lexicalResource,
        achievement: source.kriterler.taskAchievement,
      };
    }
    return {
      coherence: "KÄ±sa deÄŸerlendirme yok",
      grammar: "KÄ±sa deÄŸerlendirme yok",
      lexical: "KÄ±sa deÄŸerlendirme yok",
      achievement: "KÄ±sa deÄŸerlendirme yok",
    };
  };

  // Extract answers array (supports both legacy answers[] and new sections/subParts structure)
  const extractWritingAnswers = () => {
    // Prefer sections/subParts ordering when available to avoid misalignment
    const sections = Array.isArray(writingData?.sections) ? writingData.sections : [];
    const hasSectionAnswers = sections.some(
      (s: any) =>
        (Array.isArray(s.subParts) && s.subParts.some((sp: any) => Array.isArray(sp.answers) && sp.answers.length > 0)) ||
        (Array.isArray(s.answers) && s.answers.length > 0)
    );

    if (sections.length > 0 && hasSectionAnswers) {
      const extracted: any[] = [];
      const sortedSections = [...sections].sort((a: any, b: any) =>
        (a.order ?? a.number ?? 0) - (b.order ?? b.number ?? 0)
      );

      sortedSections.forEach((section: any, sectionIndex: number) => {
        const subParts = Array.isArray(section.subParts) ? section.subParts : [];
        const sortedSubParts = [...subParts].sort((a: any, b: any) =>
          (a.order ?? a.number ?? 0) - (b.order ?? b.number ?? 0)
        );

        // First push subPart answers (so Task 1.1 and 1.2 come first)
        sortedSubParts.forEach((subPart: any, subPartIndex: number) => {
          const subPartAnswers = Array.isArray(subPart.answers) ? subPart.answers : [];
          subPartAnswers.forEach((ans: any) => {
            extracted.push({
              ...ans,
              // Provide a reasonable questionText for UI
              questionText:
                ans.questionText ||
                ans.question ||
                subPart.description ||
                section.description ||
                `GÃ¶rev 1.${subPartIndex + 1}`,
            });
          });
        });

        // Then push section-level answers (e.g. Task 2 main essay)
        if (Array.isArray(section.answers)) {
          section.answers.forEach((ans: any, answerIndex: number) => {
            extracted.push({
              ...ans,
              questionText:
                ans.questionText ||
                ans.question ||
                section.description ||
                `GÃ¶rev ${sectionIndex + 1} ${answerIndex + 1}`,
            });
          });
        }
      });

      return extracted;
    }

    // Fallback: top-level answers array
    if (Array.isArray(writingData?.answers)) {
      const hasNonEmpty = writingData.answers.some(
        (a: any) => a && typeof a.userAnswer === "string" && a.userAnswer.trim() !== ""
      );
      if (hasNonEmpty) {
        return writingData.answers;
      }
    }

    return [];
  };

  const answers = extractWritingAnswers();

  console.log("Writing results - All answers:", answers);
  console.log("Writing results - Writing data:", writingData);

  type WritingTaskKey = "bolum_1_1" | "bolum_1_2" | "bolum_2";
  const toTaskHint = (value: unknown) =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const getTaskKeyFromAnswer = (answer: any): WritingTaskKey | null => {
    const hints = [
      answer?.questionText,
      answer?.question,
      answer?.description,
      answer?.subPart?.label,
      answer?.subPart?.description,
      answer?.section?.title,
      answer?.section?.description,
    ]
      .map(toTaskHint)
      .join(" ");

    if (/(^|\s)(1[.,]?\s*1|gorev\s*1[.,]?\s*1|bolum\s*1[.,]?\s*1)(\s|$)/.test(hints)) {
      return "bolum_1_1";
    }
    if (/(^|\s)(1[.,]?\s*2|gorev\s*1[.,]?\s*2|bolum\s*1[.,]?\s*2)(\s|$)/.test(hints)) {
      return "bolum_1_2";
    }
    if (
      /(gorev\s*2|bolum\s*2|tez|antitez|sentez|kompozisyon|blog|essay)/.test(hints)
    ) {
      return "bolum_2";
    }

    return null;
  };

  const getAnswerLength = (answer: any) =>
    typeof answer?.userAnswer === "string" ? answer.userAnswer.trim().length : 0;

  const isMeaningfulAnswer = (answer: any) => getAnswerLength(answer) > 0;
  const pickBestAnswer = (group: any[]) =>
    group.find((ans: any) => isMeaningfulAnswer(ans)) || group[0];

  const groupedAnswers = (() => {
    const groups: Record<WritingTaskKey, any[]> = {
      bolum_1_1: [],
      bolum_1_2: [],
      bolum_2: [],
    };
    const unresolved: any[] = [];

    answers.forEach((answer: any) => {
      const taskKey = getTaskKeyFromAnswer(answer);
      if (taskKey) groups[taskKey].push(answer);
      else unresolved.push(answer);
    });

    if (unresolved.length > 0 && groups.bolum_2.length === 0) {
      const longest = [...unresolved].sort(
        (a, b) => getAnswerLength(b) - getAnswerLength(a)
      )[0];
      if (longest) {
        groups.bolum_2.push(longest);
        unresolved.splice(unresolved.indexOf(longest), 1);
      }
    }

    if (unresolved.length > 0) {
      const sortedByLen = [...unresolved].sort(
        (a, b) => getAnswerLength(a) - getAnswerLength(b)
      );

      if (groups.bolum_1_1.length === 0 && sortedByLen.length > 0) {
        const shortest = sortedByLen.shift();
        if (shortest) groups.bolum_1_1.push(shortest);
      }
      if (groups.bolum_1_2.length === 0 && sortedByLen.length > 0) {
        groups.bolum_1_2.push(sortedByLen[sortedByLen.length - 1]);
      }
    }

    return groups;
  })();

  const task11Answers = groupedAnswers.bolum_1_1;
  const task12Answers = groupedAnswers.bolum_1_2;
  const task2Answers = groupedAnswers.bolum_2;

  const answeredTask11 = task11Answers.some((answer: any) => isMeaningfulAnswer(answer));
  const answeredTask12 = task12Answers.some((answer: any) => isMeaningfulAnswer(answer));
  const answeredTask2 = task2Answers.some((answer: any) => isMeaningfulAnswer(answer));

  console.log("Task 1.1 answers:", task11Answers);
  console.log("Task 1.2 answers:", task12Answers);
  console.log("Task 2 answers:", task2Answers);

  const sanitizeWritingGeneralFeedback = (rawText?: string) => {
    if (!rawText || typeof rawText !== "string") return "";
    let text = removeBullets(rawText);

    if (answeredTask11) {
      text = text.replace(/(?:bölüm|görev)\s*1[.,]?\s*1(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
    }
    if (answeredTask12) {
      text = text.replace(/(?:bölüm|görev)\s*1[.,]?\s*2(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
    }
    if (answeredTask2) {
      text = text.replace(/(?:bölüm|görev)\s*2(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
    }

    return removeBullets(text.replace(/\s{2,}/g, " ").trim());
  };

  // Get current question and answer based on active task
  const getCurrentQuestionAndAnswer = () => {
    if (activeTask === "task1") {
      // For Task 1, show the answer based on active part
      const currentAnswer =
        activeTask1Part === "part1"
          ? pickBestAnswer(task11Answers)
          : pickBestAnswer(task12Answers);
      console.log("Task 1 current answer:", currentAnswer, "part:", activeTask1Part);
      const userAnswer = currentAnswer?.userAnswer;
      
      // Get feedback for the specific part
      const feedbackKey = activeTask1Part === "part1" ? "part1_1" : "part1_2";
      const feedback = parsedFeedback?.[feedbackKey] || 
                      aiFeedback?.[feedbackKey] || 
                      `GÃ¶rev 1 ${activeTask1Part === "part1" ? "BÃ¶lÃ¼m 1" : "BÃ¶lÃ¼m 2"} geri bildirimi burada gÃ¶sterilecek`;
      
      return {
        question: currentAnswer?.questionText || `GÃ¶rev 1 ${activeTask1Part === "part1" ? "BÃ¶lÃ¼m 1" : "BÃ¶lÃ¼m 2"} Sorusu`,
        answer: userAnswer && userAnswer.trim() ? userAnswer : "Cevap verilmedi",
        comment: removeBullets(feedback)
      };
    } else {
      // For Task 2, find the answer that has a non-empty userAnswer
      const task2AnswerWithContent = pickBestAnswer(task2Answers);
      
      console.log("Task 2 answers:", task2Answers);
      console.log("Task 2 current answer with content:", task2AnswerWithContent);
      const userAnswer = task2AnswerWithContent?.userAnswer;
      
      // Get feedback for Task 2
      const feedback = parsedFeedback?.part2 || 
                      aiFeedback?.part2 || 
                      "GÃ¶rev 2 geri bildirimi burada gÃ¶sterilecek";
      
      return {
        question: task2AnswerWithContent?.questionText || "GÃ¶rev 2 Sorusu",
        answer: userAnswer && userAnswer.trim() ? userAnswer : "Cevap verilmedi",
        comment: removeBullets(feedback)
      };
    }
  };

  const currentData = getCurrentQuestionAndAnswer();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/test")}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Yazma Testi SonuÃ§larÄ±</h1>
              <p className="text-gray-600 mt-1 text-sm">PerformansÄ±nÄ±zÄ± ve geri bildirimi inceleyin</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <p className="text-xs text-gray-500">Puan</p>
              <p className="text-2xl font-bold text-gray-900">{score}</p>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <p className="text-xs text-gray-500">Seviye</p>
              <p className="text-2xl font-bold text-red-600">{resolvedLevel}</p>
            </div>
          </div>
        </div>

        {/* BÃ¶lÃ¼m BazlÄ± Ã–zet - Ham Puan + 4 Kriter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            { key: "bolum_1_1", title: "GÃ¶rev 1.1" },
            { key: "bolum_1_2", title: "GÃ¶rev 1.2" },
            { key: "bolum_2", title: "BÃ¶lÃ¼m 2" },
          ].map((section) => {
            const score = getSectionScore(section.key as any);
            const criteria = getSectionCriteria(section.key as any);
            return (
              <div key={section.key} className="border border-gray-300 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{section.title}</h3>
                  <div className="text-sm font-semibold text-red-600">
                    Ham Puan: {score !== null ? score : "-"}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                  <div><span className="font-semibold">TutarlÄ±lÄ±k:</span> {removeBullets(criteria.coherence)}</div>
                  <div><span className="font-semibold">Dil Bilgisi:</span> {removeBullets(criteria.grammar)}</div>
                  <div><span className="font-semibold">Kelime KaynaÄŸÄ±:</span> {removeBullets(criteria.lexical)}</div>
                  <div><span className="font-semibold">GÃ¶rev BaÅŸarÄ±sÄ±:</span> {removeBullets(criteria.achievement)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Task Navigation - Redesigned */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-gray-700 mb-2">Yazma GÃ¶revleri</div>
          <div className="flex flex-wrap gap-2">
            {/* Task 1.1 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part1");
              }}
              variant="outline"
              className={`h-9 px-4 text-sm font-medium transition-colors ${
                activeTask === "task1" && activeTask1Part === "part1"
                  ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              BÃ¶lÃ¼m 1.1
            </Button>

            {/* Task 1.2 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part2");
              }}
              variant="outline"
              className={`h-9 px-4 text-sm font-medium transition-colors ${
                activeTask === "task1" && activeTask1Part === "part2"
                  ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              BÃ¶lÃ¼m 1.2
            </Button>

            {/* Task 2 */}
            <Button
              onClick={() => setActiveTask("task2")}
              variant="outline"
              className={`h-9 px-4 text-sm font-medium transition-colors ${
                activeTask === "task2"
                  ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              BÃ¶lÃ¼m 2
            </Button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          {/* Question Section */}
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Soru</div>
            <div className="text-gray-800">{normalizeDisplayText(currentData.question)}</div>
          </div>

          {/* Answer Section */}
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">CevabÄ±nÄ±z</div>
            <div className="text-gray-800 whitespace-pre-wrap">{normalizeDisplayText(currentData.answer)}</div>
          </div>

          {/* EÄŸitmen Notu Section - Shows general feedback like speaking results */}
          {sanitizeWritingGeneralFeedback(parsedFeedback?.general) && (
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">EÄŸitmen Notu</div>
              <div className="text-gray-800 whitespace-pre-wrap">
                {sanitizeWritingGeneralFeedback(parsedFeedback?.general)}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "Ä°ndiriliyor..." : "SertifikayÄ± Ä°ndir (PDF)"}
          </Button>
          <Button
            onClick={() => navigate("/test")}
            variant="outline"
            className="h-9 px-4 text-sm"
          >
            BaÅŸka Test Al
          </Button>
        </div>
      </div>
    </div>
  );
}


