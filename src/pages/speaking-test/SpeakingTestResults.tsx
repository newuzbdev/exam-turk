import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import speakingSubmissionService from "@/services/speakingSubmission.service";
import axiosPrivate from "@/config/api";
import { overallTestService, overallTestFlowStore } from "@/services/overallTest.service";
import { normalizeDisplayText } from "@/utils/text";

interface SpeakingAIFeedback {
  taskAchievement?: string;
  coherenceAndCohesion?: string;
  lexicalResource?: string;
  grammaticalRangeAndAccuracy?: string;
  part1?: string;
  part2?: string;
  part3?: string;
  part4?: string;
}

type StructuredGeneralFeedback = {
  ozet: string;
  tekrar_eden_eksikler: string[];
  alinti_duzeltme: Array<{ alinti: string; duzeltilmis: string; neden: string }>;
  egzersizler: Array<{ baslik: string; uygulama: string }>;
  kapanis: string;
};

interface SpeakingAnswer {
  questionId: string;
  questionText: string;
  userAnswer: string | null;
  questionOrder?: number;
}

interface SpeakingResult {
  id: string;
  userId: string;
  speakingTestId: string;
  score?: number;
  aiFeedback?: SpeakingAIFeedback;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  speaking?: any;
  parts?: any[];
  answers?: SpeakingAnswer[];
  test?: {
    id: string;
    title: string;
  };
}

interface OverallTestResult {
  id: string;
  speaking?: SpeakingResult;
  [key: string]: any;
}

export default function SpeakingTestResults() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePart, setActivePart] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    // Try to get overall test result ID from session storage, otherwise use individual result ID
    const overallId = overallTestFlowStore.getOverallId() || resultId;
    if (!overallId) return;
    
    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(overallId, `speaking-certificate-${overallId}.pdf`);
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

    const extractSpeakingSubmissionId = (overallData: any): string | null => {
      const candidates = [
        overallData?.speaking?.id,
        overallData?.speakingResultId,
        overallData?.speaking?.submissionId,
        overallData?.speaking?.resultId,
      ];
      for (const value of candidates) {
        if (typeof value === "string" && value.trim().length > 0) return value.trim();
      }
      return null;
    };

    const fetchSpeakingSubmission = async (submissionId: string): Promise<SpeakingResult | null> => {
      try {
        const res = await axiosPrivate.get(`/api/speaking-submission/${submissionId}`);
        return (res?.data?.data || res?.data || null) as SpeakingResult | null;
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        // Try to fetch as overall test result first
        try {
          const overallRes = await axiosPrivate.get(`/api/overal-test-result/${resultId}/results`);
          const overallData = (overallRes?.data?.data || overallRes?.data) as OverallTestResult;
          
          if (overallData?.speaking) {
            // Overall endpoint may omit detailed answers; hydrate from speaking submission when possible.
            const speakingId = extractSpeakingSubmissionId(overallData);
            if (speakingId) {
              const detailed = await fetchSpeakingSubmission(speakingId);
              if (detailed) {
                setResult({
                  ...overallData.speaking,
                  ...detailed,
                  answers: detailed.answers || overallData.speaking.answers || [],
                });
                return;
              }
            }
            setResult(overallData.speaking);
            return;
          }
        } catch (e) {
          // If it fails, try as direct speaking submission
          console.log("Not an overall test result, trying direct submission...");
        }

        // Try direct speaking submission
        const data = await speakingSubmissionService.getById(resultId);
        setResult(data);
      } catch (e) {
        console.error("Error loading speaking result:", e);
        navigate("/test");
      } finally {
        setLoading(false);
      }
    })();
  }, [resultId, navigate]);

  // Keep hook order stable across loading/result branches.
  useEffect(() => {
    setActiveQuestion(0);
  }, [activePart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sonuç bulunamadı</p>
          <Button onClick={() => navigate("/test")} className="mt-4">
            Testlere Dön
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from the result structure
  const speakingData = result.speaking || result;
  const rawAiFeedback =
    speakingData?.aiFeedback ??
    speakingData?.ai_feedback ??
    speakingData?.feedback ??
    speakingData?.assessment ??
    null;

  const parseJsonCandidate = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    const cleaned = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    if (!(cleaned.startsWith("{") || cleaned.startsWith("["))) return value;
    try {
      return JSON.parse(cleaned);
    } catch {
      return value;
    }
  };

  const unwrapAiFeedback = (value: unknown): unknown => {
    let current: any = parseJsonCandidate(value);
    for (let i = 0; i < 3; i += 1) {
      if (!current || typeof current !== "object") break;
      const next =
        current?.aiFeedback ??
        current?.ai_feedback ??
        current?.feedback ??
        current?.assessment;
      if (!next || next === current) break;
      current = parseJsonCandidate(next);
    }
    return current;
  };

  const aiFeedback: any = unwrapAiFeedback(rawAiFeedback);

  const normalizeQuestionRefs = (text: string): string =>
    text
      .replace(/\bQ\s*([0-9]{1,2})\s*[''’`]?\s*(de|da|te|ta)\b/gi, (_m, n) => `${n}. soruda`)
      .replace(/\bQ\s*([0-9]{1,2})\b/gi, (_m, n) => `${n}. soru`);

  const isMeaningfulSpeakingAnswer = (value?: string) => {
    const text = String(value || "").trim();
    if (!text) return false;
    const normalized = text
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s[\]]/gu, "")
      .trim();
    if (!normalized) return false;
    if (normalized.includes("cevap bulunamad")) return false;
    if (normalized === "yanit yok" || normalized === "yanıt yok") return false;
    if (normalized === "[cevap bulunamadi]" || normalized === "[cevap bulunamadı]") return false;
    return true;
  };

  const cleanText = (value: unknown) =>
    normalizeDisplayText(
      normalizeQuestionRefs(typeof value === "string" ? value : String(value ?? ""))
    );

  const pickFirstText = (...values: unknown[]): string => {
    for (const value of values) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
    }
    return "";
  };

  const generalFeedbackText = cleanText(
    pickFirstText(
      (aiFeedback as any)?.genel_degerlendirme,
      (aiFeedback as any)?.genelDegerlendirme,
      (aiFeedback as any)?.general,
      (aiFeedback as any)?.generalFeedback,
      (aiFeedback as any)?.egitmen_notu,
      (aiFeedback as any)?.teacher_note,
    ),
  );

  const extractStructuredGeneralFeedback = (): StructuredGeneralFeedback | null => {
    const raw =
      (aiFeedback as any)?.generalStructured ??
      (aiFeedback as any)?.general_structured ??
      (aiFeedback as any)?.genel_degerlendirme_yapilandirilmis;

    if (!raw || typeof raw !== "object") return null;
    const src: any = raw;
    const clean = (value: any) => cleanText(typeof value === "string" ? value : "");

    const structured: StructuredGeneralFeedback = {
      ozet: clean(src?.ozet),
      tekrar_eden_eksikler: Array.isArray(src?.tekrar_eden_eksikler)
        ? src.tekrar_eden_eksikler.map((v: any) => clean(v)).filter(Boolean).slice(0, 6)
        : [],
      alinti_duzeltme: Array.isArray(src?.alinti_duzeltme)
        ? src.alinti_duzeltme
            .map((item: any) => ({
              alinti: clean(item?.alinti),
              duzeltilmis: clean(item?.duzeltilmis),
              neden: clean(item?.neden),
            }))
            .filter((item: any) => item.alinti || item.duzeltilmis || item.neden)
            .slice(0, 6)
        : [],
      egzersizler: Array.isArray(src?.egzersizler)
        ? src.egzersizler
            .map((item: any) => ({
              baslik: clean(item?.baslik),
              uygulama: clean(item?.uygulama),
            }))
            .filter((item: any) => item.baslik || item.uygulama)
            .slice(0, 4)
        : [],
      kapanis: clean(src?.kapanis),
    };

    const hasContent =
      structured.ozet ||
      structured.kapanis ||
      structured.tekrar_eden_eksikler.length > 0 ||
      structured.alinti_duzeltme.length > 0 ||
      structured.egzersizler.length > 0;

    return hasContent ? structured : null;
  };
  const structuredGeneralFeedback = extractStructuredGeneralFeedback();

  const parseQuestionOrder = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const direct = Number(trimmed);
      if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
      const fromText = trimmed.match(/(?:Soru|Question|Q)\s*#?\s*(\d{1,2})/i)?.[1];
      if (fromText) {
        const parsed = Number(fromText);
        if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
      }
    }
    return undefined;
  };

  type SpeakingPartKey = "bolum_1_1" | "bolum_1_2" | "bolum_2" | "bolum_3";
  type NormalizedSpeakingAnswer = SpeakingAnswer & { partKey?: SpeakingPartKey };

  const speakingPartMeta: Record<
    SpeakingPartKey,
    { labelMain: string; labelSub: string; feedbackKey: "part1" | "part2" | "part3" }
  > = {
    bolum_1_1: { labelMain: "Bölüm 1.1", labelSub: "Part 1.1", feedbackKey: "part1" },
    bolum_1_2: { labelMain: "Bölüm 1.2", labelSub: "Part 1.2", feedbackKey: "part1" },
    bolum_2: { labelMain: "Bölüm 2", labelSub: "Part 2", feedbackKey: "part2" },
    bolum_3: { labelMain: "Bölüm 3", labelSub: "Part 3", feedbackKey: "part3" },
  };

  const partOrderKeys: SpeakingPartKey[] = ["bolum_1_1", "bolum_1_2", "bolum_2", "bolum_3"];

  const createEmptyPartGroups = () => ({
    bolum_1_1: [] as NormalizedSpeakingAnswer[],
    bolum_1_2: [] as NormalizedSpeakingAnswer[],
    bolum_2: [] as NormalizedSpeakingAnswer[],
    bolum_3: [] as NormalizedSpeakingAnswer[],
  });

  const resolvePartKeyByOrder = (order?: number): SpeakingPartKey | undefined => {
    if (!order || !Number.isFinite(order)) return undefined;
    if (order <= 3) return "bolum_1_1";
    if (order <= 6) return "bolum_1_2";
    if (order === 7) return "bolum_2";
    return "bolum_3";
  };

  const parsePartKey = (value: unknown): SpeakingPartKey | undefined => {
    const raw = String(value || "").toLowerCase().replace(/\s+/g, "");
    if (!raw) return undefined;
    if (raw.includes("bolum_1_1") || raw.includes("bölüm_1_1") || raw.includes("part1.1")) return "bolum_1_1";
    if (raw.includes("bolum_1_2") || raw.includes("bölüm_1_2") || raw.includes("part1.2")) return "bolum_1_2";
    if (raw.includes("bolum_2") || raw.includes("bölüm_2") || raw === "part2") return "bolum_2";
    if (raw.includes("bolum_3") || raw.includes("bölüm_3") || raw === "part3") return "bolum_3";
    return undefined;
  };

  const toAnswerText = (answer: any): string => {
    return pickFirstText(
      answer?.userAnswer,
      answer?.answer,
      answer?.text,
      answer?.transcript,
      answer?.content,
    );
  };

  const normalizeAnswerItem = (
    answer: any,
    index: number,
    partHint?: SpeakingPartKey,
  ): NormalizedSpeakingAnswer => {
    const questionOrder =
      parseQuestionOrder(answer?.questionOrder) ??
      parseQuestionOrder(answer?.order) ??
      parseQuestionOrder(answer?.question?.order) ??
      parseQuestionOrder(answer?.questionNumber) ??
      index + 1;

    const inferredPartKey =
      partHint ??
      parsePartKey(answer?.partKey) ??
      parsePartKey(answer?.sectionKey) ??
      parsePartKey(answer?.section?.key) ??
      resolvePartKeyByOrder(questionOrder);

    return {
      questionId:
        (typeof answer?.questionId === "string" && answer.questionId) ||
        (typeof answer?.questionId === "number" && String(answer.questionId)) ||
        (typeof answer?.id === "string" && answer.id) ||
        (typeof answer?.id === "number" && String(answer.id)) ||
        (typeof answer?.question?.id === "string" && answer.question.id) ||
        (typeof answer?.question?.id === "number" && String(answer.question.id)) ||
        `q-${index + 1}`,
      questionText:
        pickFirstText(
          answer?.questionText,
          answer?.question?.questionText,
          answer?.question?.text,
          answer?.prompt,
          typeof answer?.question === "string" ? answer.question : "",
          typeof answer?.text === "string" && !answer?.userAnswer ? answer.text : "",
        ) || `Soru ${index + 1}`,
      userAnswer: toAnswerText(answer) || null,
      questionOrder,
      partKey: inferredPartKey,
    };
  };

  const dedupeAnswers = (items: NormalizedSpeakingAnswer[]) => {
    const byKey = new Map<string, NormalizedSpeakingAnswer>();
    items.forEach((item, index) => {
      const key = `${item.questionId}::${item.partKey || "unknown"}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, item);
        return;
      }
      const existingLen = String(existing.userAnswer || "").trim().length;
      const nextLen = String(item.userAnswer || "").trim().length;
      if (nextLen > existingLen || (nextLen === existingLen && index > 0)) {
        byKey.set(key, item);
      }
    });
    return Array.from(byKey.values()).sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0));
  };

  const groupAnswersByParts = (items: NormalizedSpeakingAnswer[]) => {
    const grouped = createEmptyPartGroups();
    const unresolved: NormalizedSpeakingAnswer[] = [];

    items.forEach((item) => {
      const key = item.partKey || resolvePartKeyByOrder(item.questionOrder);
      if (key) {
        grouped[key].push({ ...item, partKey: key });
      } else {
        unresolved.push(item);
      }
    });

    unresolved.forEach((item) => {
      if (grouped.bolum_1_1.length < 3) {
        grouped.bolum_1_1.push({ ...item, partKey: "bolum_1_1" });
      } else if (grouped.bolum_1_2.length < 3) {
        grouped.bolum_1_2.push({ ...item, partKey: "bolum_1_2" });
      } else if (grouped.bolum_2.length < 1) {
        grouped.bolum_2.push({ ...item, partKey: "bolum_2" });
      } else {
        grouped.bolum_3.push({ ...item, partKey: "bolum_3" });
      }
    });

    return grouped;
  };

  const splitPart1Questions = (rawQuestions: any[]) => {
    const normalized = rawQuestions.map((item, index) => normalizeAnswerItem(item, index));
    const grouped = groupAnswersByParts(normalized);
    return {
      part11: grouped.bolum_1_1.map((item) => ({ ...item, partKey: "bolum_1_1" as SpeakingPartKey })),
      part12: grouped.bolum_1_2.map((item) => ({ ...item, partKey: "bolum_1_2" as SpeakingPartKey })),
    };
  };

  const appendPartQuestions = (
    target: NormalizedSpeakingAnswer[],
    rawQuestions: any[],
    key: SpeakingPartKey,
  ) => {
    rawQuestions.forEach((question, index) => {
      target.push(normalizeAnswerItem(question, target.length + index, key));
    });
  };

  const extractStructuredAnswers = (): NormalizedSpeakingAnswer[] => {
    const collected: NormalizedSpeakingAnswer[] = [];

    const addPart1FromNode = (partNode: any) => {
      if (!partNode || typeof partNode !== "object") return;
      const sections = Array.isArray(partNode?.sections) ? partNode.sections : [partNode];

      sections.forEach((section: any) => {
        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        if (subParts.length >= 2) {
          appendPartQuestions(collected, Array.isArray(subParts[0]?.questions) ? subParts[0].questions : [], "bolum_1_1");
          appendPartQuestions(collected, Array.isArray(subParts[1]?.questions) ? subParts[1].questions : [], "bolum_1_2");
          for (let i = 2; i < subParts.length; i += 1) {
            appendPartQuestions(
              collected,
              Array.isArray(subParts[i]?.questions) ? subParts[i].questions : [],
              "bolum_1_2",
            );
          }
        } else if (subParts.length === 1) {
          const split = splitPart1Questions(Array.isArray(subParts[0]?.questions) ? subParts[0].questions : []);
          collected.push(...split.part11, ...split.part12);
        }

        const directQuestions = Array.isArray(section?.questions) ? section.questions : [];
        if (directQuestions.length > 0) {
          const split = splitPart1Questions(directQuestions);
          collected.push(...split.part11, ...split.part12);
        }
      });
    };

    const addGenericPart = (partNode: any, key: SpeakingPartKey) => {
      if (!partNode || typeof partNode !== "object") return;
      const sections = Array.isArray(partNode?.sections) ? partNode.sections : [];
      sections.forEach((section: any) => {
        appendPartQuestions(collected, Array.isArray(section?.questions) ? section.questions : [], key);
        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        subParts.forEach((subPart: any) => {
          appendPartQuestions(collected, Array.isArray(subPart?.questions) ? subPart.questions : [], key);
        });
      });

      appendPartQuestions(collected, Array.isArray(partNode?.questions) ? partNode.questions : [], key);
      const topSubParts = Array.isArray(partNode?.subParts) ? partNode.subParts : [];
      topSubParts.forEach((subPart: any) => {
        appendPartQuestions(collected, Array.isArray(subPart?.questions) ? subPart.questions : [], key);
      });
    };

    const dataAsAny = speakingData as any;
    addPart1FromNode(dataAsAny?.part1);
    addGenericPart(dataAsAny?.part2, "bolum_2");
    addGenericPart(dataAsAny?.part3, "bolum_3");

    if (collected.length === 0) {
      const parts = Array.isArray(dataAsAny?.parts) ? dataAsAny.parts : [];
      const byType = {
        part1: parts.find((part: any) => String(part?.type || "").toUpperCase().includes("PART1")),
        part2: parts.find((part: any) => String(part?.type || "").toUpperCase().includes("PART2")),
        part3: parts.find((part: any) => String(part?.type || "").toUpperCase().includes("PART3")),
      };

      addPart1FromNode(byType.part1 || parts[0]);
      addGenericPart(byType.part2 || parts[1], "bolum_2");
      addGenericPart(byType.part3 || parts[2], "bolum_3");
      if (!byType.part3 && parts[3]) {
        addGenericPart(parts[3], "bolum_3");
      }
    }

    return dedupeAnswers(collected);
  };
  
  // Extract scores from AI feedback or use defaults
  const extractScoreFromFeedback = (feedbackText: string) => {
    // Try to extract numeric score from feedback text
    const match = feedbackText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const scores = {
    overall: speakingData?.score || 0,
    coherence: extractScoreFromFeedback(aiFeedback?.coherenceAndCohesion) || 0,
    grammar: extractScoreFromFeedback(aiFeedback?.grammaticalRangeAndAccuracy) || 0,
    lexical: extractScoreFromFeedback(aiFeedback?.lexicalResource) || 0,
    achievement: extractScoreFromFeedback(aiFeedback?.taskAchievement) || 0,
  };

  const extractSessionAnswers = (): any[] => {
    const candidates: string[] = [];
    const speakingTestId = String(
      speakingData?.speakingTestId || result?.speakingTestId || "",
    ).trim();
    if (speakingTestId) {
      candidates.push(`speaking_answers_${speakingTestId}`);
    }
    if (typeof resultId === "string" && resultId.trim()) {
      candidates.push(`speaking_answers_${resultId.trim()}`);
    }

    for (const key of candidates) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const collected: any[] = [];

        if (parsed?.transcripts && typeof parsed.transcripts === "object") {
          for (const [qid, text] of Object.entries(parsed.transcripts)) {
            collected.push({
              questionId: qid,
              userAnswer: typeof text === "string" ? text : "",
            });
          }
        }

        if (parsed?.answers && typeof parsed.answers === "object") {
          for (const [qid, value] of Object.entries(parsed.answers)) {
            const maybeObj: any = value;
            const answerText =
              typeof value === "string" ? value : typeof maybeObj?.text === "string" ? maybeObj.text : "";
            collected.push({
              questionId: qid,
              userAnswer: answerText,
            });
          }
        }

        if (collected.length > 0) return collected;
      } catch {
        // ignore corrupted session payload
      }
    }

    return [];
  };

  const extractObjectMappedAnswers = (value: unknown): any[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }
    const collected: any[] = [];
    for (const [questionId, payload] of Object.entries(value as Record<string, any>)) {
      if (!String(questionId).trim()) continue;
      if (payload && typeof payload === "object") {
        collected.push({
          questionId,
          ...(payload as any),
        });
      } else {
        collected.push({
          questionId,
          userAnswer: typeof payload === "string" ? payload : String(payload ?? ""),
        });
      }
    }
    return collected;
  };

  const mappedAnswers =
    extractObjectMappedAnswers(speakingData?.answers).length > 0
      ? extractObjectMappedAnswers(speakingData?.answers)
      : extractObjectMappedAnswers(result?.answers).length > 0
        ? extractObjectMappedAnswers(result?.answers)
        : extractObjectMappedAnswers(speakingData?.transcripts).map((item) => ({
            ...item,
            userAnswer: item?.userAnswer ?? item?.text ?? item?.transcript,
          }));

  const flatRawAnswers: any[] = Array.isArray(speakingData?.answers)
    ? speakingData.answers
    : Array.isArray(speakingData?.questions)
      ? speakingData.questions
      : Array.isArray(result?.answers)
        ? result.answers
        : mappedAnswers.length > 0
          ? mappedAnswers
          : extractSessionAnswers();

  const normalizedFromFlat = dedupeAnswers(
    flatRawAnswers.map((answer: any, index: number) => normalizeAnswerItem(answer, index)),
  );
  const normalizedFromStructured = extractStructuredAnswers();
  const normalizedFromSession = dedupeAnswers(
    extractSessionAnswers().map((answer: any, index: number) => normalizeAnswerItem(answer, index)),
  );

  const isGenericQuestionText = (value?: string | null) => {
    const text = String(value || "").trim();
    if (!text) return true;
    return /^soru\s*\d+$/i.test(text);
  };

  const buildQuestionMetaLookup = (items: NormalizedSpeakingAnswer[]) => {
    const byId = new Map<
      string,
      { questionText: string; questionOrder?: number; partKey?: SpeakingPartKey }
    >();
    items.forEach((item) => {
      const qid = String(item.questionId || "").trim();
      if (!qid) return;
      const existing = byId.get(qid);
      const questionText = !isGenericQuestionText(item.questionText)
        ? item.questionText
        : existing?.questionText || "";
      byId.set(qid, {
        questionText,
        questionOrder: item.questionOrder ?? existing?.questionOrder,
        partKey: item.partKey ?? existing?.partKey,
      });
    });
    return byId;
  };

  const buildAnswerLookups = (items: NormalizedSpeakingAnswer[]) => {
    const byId = new Map<string, string>();
    const byOrder = new Map<number, string>();

    const setIfBetter = (target: Map<any, string>, key: any, text: string) => {
      if (key === undefined || key === null || key === "") return;
      const existing = target.get(key);
      if (!existing || text.length >= existing.length) {
        target.set(key, text);
      }
    };

    items.forEach((item) => {
      const text = String(item.userAnswer || "").trim();
      if (!isMeaningfulSpeakingAnswer(text)) return;
      const qid = String(item.questionId || "").trim();
      const order = item.questionOrder;
      if (qid) setIfBetter(byId, qid, text);
      if (typeof order === "number" && Number.isFinite(order) && order > 0) {
        setIfBetter(byOrder, Math.floor(order), text);
      }
    });

    return { byId, byOrder };
  };

  const questionMetaLookup = buildQuestionMetaLookup([
    ...normalizedFromStructured,
    ...normalizedFromFlat,
  ]);

  const answerLookup = buildAnswerLookups([
    ...normalizedFromSession,
    ...normalizedFromFlat,
    ...normalizedFromStructured,
  ]);

  const hydrateAnswers = (items: NormalizedSpeakingAnswer[]) =>
    dedupeAnswers(
      items.map((item, index) => {
        const qid = String(item.questionId || "").trim();
        const meta = qid ? questionMetaLookup.get(qid) : undefined;
        const existingText = String(item.userAnswer || "").trim();
        const fallbackText =
          (qid ? answerLookup.byId.get(qid) : undefined) ||
          (item.questionOrder ? answerLookup.byOrder.get(item.questionOrder) : undefined) ||
          "";
        const finalText = isMeaningfulSpeakingAnswer(existingText)
          ? existingText
          : String(fallbackText || "").trim();
        const questionText =
          !isGenericQuestionText(item.questionText) || !meta?.questionText
            ? item.questionText
            : meta.questionText;
        const questionOrder = item.questionOrder ?? meta?.questionOrder ?? index + 1;
        const partKey = item.partKey ?? meta?.partKey ?? resolvePartKeyByOrder(questionOrder);

        return {
          ...item,
          questionText,
          userAnswer: finalText || item.userAnswer || null,
          questionOrder,
          partKey,
        };
      }),
    );

  const hydratedFlat = hydrateAnswers(normalizedFromFlat);
  const hydratedStructured = hydrateAnswers(normalizedFromStructured);
  const hydratedSession = hydrateAnswers(normalizedFromSession);

  const evaluateCandidate = (items: NormalizedSpeakingAnswer[]) => {
    const meaningful = items.filter((item) =>
      isMeaningfulSpeakingAnswer(String(item.userAnswer || "")),
    ).length;
    const grouped = groupAnswersByParts(items);
    const coverage = partOrderKeys.filter((key) =>
      grouped[key].some((item) => isMeaningfulSpeakingAnswer(String(item.userAnswer || ""))),
    ).length;
    const total = items.length;
    const ratio = total > 0 ? meaningful / total : 0;
    return { meaningful, coverage, ratio, total };
  };

  type AnswerSource = "flat" | "structured" | "session";
  type AnswerCandidate = { source: AnswerSource; items: NormalizedSpeakingAnswer[] };

  const chooseBestAnswers = (candidates: AnswerCandidate[]): NormalizedSpeakingAnswer[] => {
    const sourcePriority: Record<"flat" | "structured" | "session", number> = {
      structured: 3,
      flat: 2,
      session: 1,
    };

    const isBetterScore = (
      next: { meaningful: number; coverage: number; ratio: number; total: number; priority: number },
      current: { meaningful: number; coverage: number; ratio: number; total: number; priority: number } | null,
    ) => {
      if (!current) return true;
      return (
        next.meaningful > current.meaningful ||
        (next.meaningful === current.meaningful &&
          next.coverage > current.coverage) ||
        (next.meaningful === current.meaningful &&
          next.coverage === current.coverage &&
          next.ratio > current.ratio) ||
        (next.meaningful === current.meaningful &&
          next.coverage === current.coverage &&
          next.ratio === current.ratio &&
          next.total > current.total) ||
        (next.meaningful === current.meaningful &&
          next.coverage === current.coverage &&
          next.ratio === current.ratio &&
          next.total === current.total &&
          next.priority > current.priority)
      );
    };

    let bestCandidateIndex = -1;
    let bestScore: { meaningful: number; coverage: number; ratio: number; total: number; priority: number } | null = null;

    candidates.forEach((candidate, index) => {
      const score = evaluateCandidate(candidate.items);
      const fullScore = {
        ...score,
        priority: sourcePriority[candidate.source],
      };

      if (isBetterScore(fullScore, bestScore)) {
        bestCandidateIndex = index;
        bestScore = fullScore;
      }
    });

    if (bestCandidateIndex >= 0) return candidates[bestCandidateIndex].items;
    return candidates[0]?.items || [];
  };

  const answers =
    hydratedStructured.length > 0
      ? hydratedStructured
      : chooseBestAnswers([
          { source: "flat", items: hydratedFlat },
          { source: "structured", items: hydratedStructured },
          { source: "session", items: hydratedSession },
        ]);

  const regroupByExpectedLayout = (items: NormalizedSpeakingAnswer[]) => {
    const regrouped = createEmptyPartGroups();
    const sorted = [...items].sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0));
    sorted.forEach((item, index) => {
      let target: SpeakingPartKey;
      if (index < 3) target = "bolum_1_1";
      else if (index < 6) target = "bolum_1_2";
      else if (index === 6) target = "bolum_2";
      else target = "bolum_3";
      regrouped[target].push({
        ...item,
        partKey: target,
      });
    });
    return regrouped;
  };

  const groupedBySource = groupAnswersByParts(answers);
  const shouldRegroupByExpectedLayout = (() => {
    const total = answers.length;
    if (total < 7) return false;
    if (groupedBySource.bolum_1_1.length > 4) return true;
    if (groupedBySource.bolum_1_1.length >= 6 && groupedBySource.bolum_1_2.length <= 1) return true;
    if (groupedBySource.bolum_1_2.length === 0 && groupedBySource.bolum_2.length === 0) return true;
    return false;
  })();

  const groupedPartsRaw = shouldRegroupByExpectedLayout
    ? regroupByExpectedLayout(answers)
    : groupedBySource;

  const repairGroupedParts = (
    base: Record<SpeakingPartKey, NormalizedSpeakingAnswer[]>,
  ) => {
    const baseQuestionToPart = new Map<string, SpeakingPartKey>();
    partOrderKeys.forEach((partKey) => {
      base[partKey].forEach((item) => {
        const qid = String(item.questionId || "").trim();
        if (qid && !baseQuestionToPart.has(qid)) {
          baseQuestionToPart.set(qid, partKey);
        }
      });
    });

    const allSources = dedupeAnswers([
      ...hydratedStructured,
      ...hydratedFlat,
      ...hydratedSession,
    ]);

    const byQuestionId = new Map<string, string>();
    const byPartKey: Record<SpeakingPartKey, string[]> = {
      bolum_1_1: [],
      bolum_1_2: [],
      bolum_2: [],
      bolum_3: [],
    };

    const setIfBetter = (target: Map<any, string>, key: any, text: string) => {
      if (key === undefined || key === null || key === "") return;
      const existing = target.get(key);
      if (!existing || text.length >= existing.length) {
        target.set(key, text);
      }
    };

    allSources.forEach((item) => {
      const text = String(item.userAnswer || "").trim();
      if (!isMeaningfulSpeakingAnswer(text)) return;
      const qid = String(item.questionId || "").trim();
      const partKey = item.partKey || (qid ? baseQuestionToPart.get(qid) : undefined);

      if (qid) setIfBetter(byQuestionId, qid, text);
      if (partKey) {
        byPartKey[partKey].push(text);
      }
    });

    const usedQuestionIds = new Set<string>();
    const repaired = createEmptyPartGroups();

    partOrderKeys.forEach((partKey) => {
      repaired[partKey] = base[partKey].map((item) => {
        const existing = String(item.userAnswer || "").trim();
        if (isMeaningfulSpeakingAnswer(existing)) return item;

        const qid = String(item.questionId || "").trim();

        let replacement = "";
        if (qid && byQuestionId.has(qid) && !usedQuestionIds.has(qid)) {
          replacement = String(byQuestionId.get(qid) || "").trim();
          if (replacement) usedQuestionIds.add(qid);
        }

        if (!replacement) {
          const bucket = byPartKey[partKey] || [];
          while (bucket.length > 0 && !replacement) {
            const candidate = String(bucket.shift() || "").trim();
            if (candidate && isMeaningfulSpeakingAnswer(candidate)) {
              replacement = candidate;
            }
          }
        }

        if (!replacement) return item;
        return { ...item, userAnswer: replacement };
      });
    });

    return repaired;
  };

  const groupedParts = repairGroupedParts(groupedPartsRaw);
  const visibleParts = partOrderKeys
    .map((key) => ({ key, questions: groupedParts[key], meta: speakingPartMeta[key] }))
    .filter((entry) => entry.questions.length > 0);
  const effectiveActivePart = visibleParts[activePart] ? activePart : 0;
  
  // Get current question and answer based on active part
  const getCurrentQuestionAndAnswer = () => {
    if (visibleParts.length > 0 && visibleParts[effectiveActivePart]) {
      const activeEntry = visibleParts[effectiveActivePart];
      const partQuestions = activeEntry.questions;
      const currentQuestionIndex = Math.min(activeQuestion, partQuestions.length - 1);
      const currentAnswer = partQuestions[currentQuestionIndex];
      const partKey = activeEntry.key;
      const feedbackKey = speakingPartMeta[partKey].feedbackKey;
      const bolumler = (aiFeedback as any)?.bolumler || (aiFeedback as any)?.["bölümler"] || {};
      const sectionFeedback = bolumler?.[partKey]?.degerlendirme || bolumler?.[partKey]?.["değerlendirme"];
      const partFeedbackRaw = sectionFeedback || (aiFeedback as any)?.[feedbackKey] ||
                           aiFeedback?.taskAchievement ||
                           `${speakingPartMeta[partKey].labelMain} geri bildirimi burada gösterilecek`;
      const partFeedback = cleanText(partFeedbackRaw);
      const answerText = toAnswerText(currentAnswer);
      
      return {
        question: cleanText(currentAnswer?.questionText || `${speakingPartMeta[partKey].labelMain} Sorusu ${currentQuestionIndex + 1}`),
        answer: isMeaningfulSpeakingAnswer(answerText)
          ? cleanText(answerText)
          : "Cevap verilmedi",
        comment: partFeedback
      };
    }
    
    return {
      question: "Soru metni burada gösterilecek",
      answer: "Cevap verilmedi",
      comment: cleanText((aiFeedback as any)?.genel_degerlendirme || (aiFeedback as any)?.general || aiFeedback?.part1 || aiFeedback?.taskAchievement || "Geri bildirim mevcut değil")
    };
  };

  const currentData = getCurrentQuestionAndAnswer();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/test")}
              className="p-2 hover:bg-white/80 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Konuşma Testi Sonuçları</h1>
              <p className="text-gray-600 mt-1">Performansınızı ve geri bildirimi inceleyin</p>
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Genel Puan</h2>
                <p className="text-gray-600">Konuşma testi performansınız</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-600">{scores.overall}</div>
                <div className="text-sm text-gray-500">Bant Puanı</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Categories Grid */}
        {aiFeedback && (() => {
          const feedback = aiFeedback as any;
          const hasPartFeedback = feedback.part1 || feedback.part2 || feedback.part3 || feedback.part4;
          const hasIELTSFeedback = feedback.coherenceAndCohesion || feedback.grammaticalRangeAndAccuracy || 
                                   feedback.lexicalResource || feedback.taskAchievement;
          
          if (!hasPartFeedback && !hasIELTSFeedback) {
            return null;
          }
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {feedback.part1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 1</h3>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part1)}
                  </p>
                </div>
              )}
              {feedback.part2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 2</h3>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part2)}
                  </p>
                </div>
              )}
              {feedback.part3 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 3</h3>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part3)}
                  </p>
                </div>
              )}
              {feedback.part4 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 4</h3>
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part4)}
                  </p>
                </div>
              )}
              {/* Fallback to IELTS-style feedback if part1-4 not available */}
              {!hasPartFeedback && hasIELTSFeedback && (
                <>
                  {feedback.coherenceAndCohesion && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Tutarlılık ve Bağlılık</h3>
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.coherenceAndCohesion)}
                      </p>
                    </div>
                  )}
                  {feedback.grammaticalRangeAndAccuracy && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Dil Bilgisi</h3>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.grammaticalRangeAndAccuracy)}
                      </p>
                    </div>
                  )}
                  {feedback.lexicalResource && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Kelime Kaynağı</h3>
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.lexicalResource)}
                      </p>
                    </div>
                  )}
                  {feedback.taskAchievement && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Görev Başarısı</h3>
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.taskAchievement)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Part Navigation - Redesigned */}
        {visibleParts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Konuşma Bölümleri</h3>
             
            {/* All Parts in One Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {visibleParts.map((partEntry, index: number) => (
                <Button
                  key={partEntry.key}
                  onClick={() => setActivePart(index)}
                  variant="outline"
                  className={`h-16 rounded-lg font-medium transition-all ${
                    effectiveActivePart === index
                      ? "bg-red-600 text-white hover:bg-red-700 shadow-md border-red-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">{partEntry.meta.labelMain}</div>
                    <div className="text-xs opacity-75">{partEntry.meta.labelSub}</div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Question Navigation within Part */}
            {visibleParts[effectiveActivePart] &&
              visibleParts[effectiveActivePart].questions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {visibleParts[effectiveActivePart].questions.map((_question: any, index: number) => (
                  <Button
                    key={index}
                    onClick={() => setActiveQuestion(index)}
                    variant="outline"
                    size="sm"
                    className={`transition-all ${
                      activeQuestion === index
                        ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                    }`}
                  >
                    Soru {index + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Question Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">Q</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Soru</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{currentData.question}</p>
            </div>
          </div>

          {/* Answer Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">A</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Cevabınız</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.answer}</p>
            </div>
          </div>

          {(generalFeedbackText || structuredGeneralFeedback) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-semibold text-sm">G</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Eğitmen Notu</h2>
              </div>
              {structuredGeneralFeedback ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {structuredGeneralFeedback.ozet && (
                    <div>
                      <h4 className="font-bold text-black mb-1">Özet</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {structuredGeneralFeedback.ozet}
                      </p>
                    </div>
                  )}

                  {structuredGeneralFeedback.tekrar_eden_eksikler.length > 0 && (
                    <div>
                      <h4 className="font-bold text-black mb-1">Tekrar Eden Eksikler</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                        {structuredGeneralFeedback.tekrar_eden_eksikler.map((item, idx) => (
                          <li key={`sp-eksik-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {structuredGeneralFeedback.alinti_duzeltme.length > 0 && (
                    <div>
                      <h4 className="font-bold text-black mb-2">İyileştirmeler</h4>
                      <div className="space-y-3">
                        {structuredGeneralFeedback.alinti_duzeltme.map((item, idx) => (
                          <div
                            key={`sp-rewrite-${idx}`}
                            className="rounded-lg border border-gray-200 bg-gray-100 p-3"
                          >
                            {item.alinti && (
                              <>
                                <p className="text-xs font-semibold text-black mb-1">Alıntı</p>
                                <p className="text-red-600 font-medium whitespace-pre-wrap mb-2">
                                  "{item.alinti}"
                                </p>
                              </>
                            )}
                            {item.duzeltilmis && (
                              <>
                                <p className="text-xs font-semibold text-black mb-1">Düzeltilmiş Versiyon</p>
                                <p className="text-green-700 whitespace-pre-wrap mb-2">
                                  {item.duzeltilmis}
                                </p>
                              </>
                            )}
                            {item.neden && (
                              <>
                                <p className="text-xs font-semibold text-black mb-1">Neden Düzelttik?</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{item.neden}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {structuredGeneralFeedback.egzersizler.length > 0 && (
                    <div>
                      <h4 className="font-bold text-black mb-1">Önerilen Egzersizler</h4>
                      <div className="space-y-2">
                        {structuredGeneralFeedback.egzersizler.map((item, idx) => (
                          <div
                            key={`sp-exercise-${idx}`}
                            className="rounded-md border border-gray-200 bg-white p-3"
                          >
                            <p className="font-semibold text-black">{idx + 1}. {item.baslik || "Egzersiz"}</p>
                            {item.uygulama && (
                              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{item.uygulama}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {structuredGeneralFeedback.kapanis && (
                    <div>
                      <h4 className="font-bold text-black mb-1">Son Not</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {structuredGeneralFeedback.kapanis}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{generalFeedbackText}</p>
                </div>
              )}
            </div>
          )}

          {/* Comment Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">N</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Bölüm Yorumu</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.comment}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Download className="w-5 h-5 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
          </Button>
          <Button
            onClick={() => navigate("/test")}
            variant="outline"
            className="px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Başka Test Al
          </Button>
        </div>
      </div>
    </div>
  );
}





