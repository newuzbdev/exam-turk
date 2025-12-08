import { BookOpen, Headphones, Mic, PenTool, ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import overallTestService, { overallTestFlowStore } from "@/services/overallTest.service";
import { toast } from "sonner";
import testCoinPriceService from "@/services/testCoinPrice.service";
import type { TestCoinPriceItem } from "@/services/testCoinPrice.service";

interface TurkishTest {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface WritingTest {
  id: string;
  title: string;
  instruction: string;
  type: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface SpeakingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface ListeningTest {
  id: string;
  title: string;
  type: string;
  description: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReadingTest {
  id: string;
  title: string;
  type: string;
  description: string;
  ieltsId: string;
  createdAt: string;
  updatedAt: string;
}

interface TestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTest: TurkishTest;
  writingTests: WritingTest[];
  speakingTests: SpeakingTest[];
  listeningTests: ListeningTest[];
  readingTests: ReadingTest[];
  onTestTypeClick: (testType: string, tests: any[]) => void;
}

const TestModal = ({
  open,
  onOpenChange,
  selectedTest,
  writingTests,
  speakingTests,
  listeningTests,
  readingTests,
}: TestModalProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // selection state for simple checklist UI
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({
    listening: true,
    reading: true,
    writing: true,
    speaking: true,
  });

  const toggle = (key: string) =>
    setSelectedMap((p) => ({ ...p, [key]: !p[key] }));


  console.log("TestModal - Selected test:", selectedTest);
  console.log("TestModal - Writing tests received:", writingTests);

  // dynamic coin prices
  const [coinPrices, setCoinPrices] = useState<TestCoinPriceItem[] | null>(null);
  useEffect(() => {
    let mounted = true;
    testCoinPriceService.getAll().then((items) => {
      if (mounted) setCoinPrices(items);
    });
    return () => { mounted = false; };
  }, []);

  const coinByType = useMemo(() => {
    const map: Record<string, number> = {};
    (coinPrices || []).forEach((i) => { map[i.testType] = i.coin; });
    return map;
  }, [coinPrices]);

  const testSections = [
    {
      id: "listening",
      title: "DİNLEME",
      icon: Headphones,
      tests: listeningTests,
      cost: coinByType["LISTENING"] ?? 3,
    },
    {
      id: "reading",
      title: "OKUMA",
      icon: BookOpen,
      tests: readingTests,
      cost: coinByType["READING"] ?? 3,
    },
    {
      id: "writing",
      title: "YAZMA",
      icon: PenTool,
      tests: writingTests,
      cost: coinByType["WRITING"] ?? 4,
    },
    {
      id: "speaking",
      title: "KONUŞMA",
      icon: Mic,
      tests: speakingTests,
      cost: coinByType["SPEAKING"] ?? 2,
    },
  ];

  const totalCoins = testSections.reduce((acc, s) => {
    const available = s.tests && s.tests.length > 0;
    return acc + (available && selectedMap[s.id] ? s.cost : 0);
  }, 0);

  const handleCta = async () => {
    // Determine selected tests and call overall start API first
    const readingId = selectedMap.reading && readingTests?.[0]?.id ? readingTests[0].id : undefined;
    const listeningId = selectedMap.listening && listeningTests?.[0]?.id ? listeningTests[0].id : undefined;
    const writingId = selectedMap.writing && writingTests?.[0]?.id ? writingTests[0].id : undefined;
    const speakingId = selectedMap.speaking && speakingTests?.[0]?.id ? speakingTests[0].id : undefined;

    if (!readingId && !listeningId && !writingId && !speakingId) {
      toast.error("Lütfen en az bir test bölümü seçin");
      return;
    }

    if (!isAuthenticated) {
      // compute first path for redirect after signup
      const chosen = [
        { id: "listening", tests: listeningTests },
        { id: "reading", tests: readingTests },
        { id: "writing", tests: writingTests },
        { id: "speaking", tests: speakingTests },
      ].find((s) => selectedMap[s.id] && s.tests && s.tests.length > 0);
      const test = chosen?.tests?.[0];
      const path = !chosen || !test
        ? "/"
        : chosen.id === "speaking"
          ? `/speaking-test/${test.id}`
          : chosen.id === "writing"
            ? `/writing-test/${test.id}`
            : chosen.id === "listening"
              ? `/listening-test/${test.id}`
              : `/reading-test/${test.id}`;
      navigate("/signup", { state: { redirectTo: path } });
      return;
    }

    // Preflight coin check: redirect to pricing if not enough coins
    const userCoins = user?.coin ?? 0;
    if (userCoins < totalCoins) {
      toast.error("Yetersiz birim. Başlamak için lütfen daha fazla satın alın.");
      navigate(`/price?neededCoins=${totalCoins - userCoins}`);
      return;
    }

    // Show loading state
    // toast.info("Starting test session...");

    const startRes = await overallTestService.start({ readingId, listeningId, writingId, speakingId });
    if (!startRes) return;
    try {
      const oid = (startRes as any)?.overallTestId || (startRes as any)?.overallId || (startRes as any)?.overallTestResultId || (startRes as any)?.id;
      if (oid) overallTestFlowStore.setOverallId(String(oid));
    } catch {}

    // Build ordered queue based on selection order in UI (listening -> reading -> writing -> speaking)
    const queue = [
      selectedMap.listening && listeningTests?.[0]?.id
        ? { testType: "LISTENING" as const, testId: listeningTests[0].id, path: `/listening-test/${listeningTests[0].id}` }
        : null,
      selectedMap.reading && readingTests?.[0]?.id
        ? { testType: "READING" as const, testId: readingTests[0].id, path: `/reading-test/${readingTests[0].id}` }
        : null,
      selectedMap.writing && writingTests?.[0]?.id
        ? { testType: "WRITING" as const, testId: writingTests[0].id, path: `/writing-test/${writingTests[0].id}` }
        : null,
      selectedMap.speaking && speakingTests?.[0]?.id
        ? { testType: "SPEAKING" as const, testId: speakingTests[0].id, path: `/speaking-test/${speakingTests[0].id}` }
        : null,
    ].filter(Boolean) as { testType: any; testId: string; path: string }[];

    // Fetch ALL test data upfront to avoid GET requests during navigation
    // toast.info("Loading test data...");
    try {
      const { listeningTestService } = await import("@/services/listeningTest.service");
      const { readingTestService } = await import("@/services/readingTest.service");
      const { writingTestService } = await import("@/services/writingTest.service");
      const { default: axiosPrivate } = await import("@/config/api");

      const testDataPromises = [];

      // Fetch listening test data
      if (listeningId) {
        testDataPromises.push(
          listeningTestService.getTestWithFullData(listeningId).then(data => ({
            type: 'LISTENING',
            testId: listeningId,
            data
          }))
        );
      }

      // Fetch reading test data
      if (readingId) {
        testDataPromises.push(
          readingTestService.getTestWithFullData(readingId).then(data => ({
            type: 'READING',
            testId: readingId,
            data
          }))
        );
      }

      // Fetch writing test data
      if (writingId) {
        testDataPromises.push(
          writingTestService.getById(writingId).then(data => ({
            type: 'WRITING',
            testId: writingId,
            data
          }))
        );
      }

      // Fetch speaking test data
      if (speakingId) {
        testDataPromises.push(
          axiosPrivate.get(`/api/speaking-test/${speakingId}`).then((res: any) => ({
            type: 'SPEAKING',
            testId: speakingId,
            data: res.data
          }))
        );
      }

      // Wait for all test data to load
      const allTestData = await Promise.all(testDataPromises);
      
      // Store all test data in sessionStorage
      allTestData.forEach(({ type, testId, data }: { type: string; testId: string; data: any }) => {
        sessionStorage.setItem(`test_data_${type}_${testId}`, JSON.stringify(data));
      });

      // toast.success("Test data loaded successfully!");
    } catch (error) {
      console.error("Error loading test data:", error);
      toast.error("Bazı test verileri yüklenemedi, ancak devam ediliyor...");
    }

    // Store the queue in session for chaining
    // Set queue and ensure initial count is correct
    overallTestFlowStore.setQueue(queue);

    // Navigate to the first in queue
    const first = queue[0];
    if (first?.path) navigate(first.path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[90vw] bg-white text-gray-900 rounded-lg border border-gray-200 shadow-xl p-0">
        {/* Header */}
        <div className="relative p-4 pb-3">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {selectedTest.title}
            </h2>
            <p className="text-xs text-gray-600">
              Almak istediğiniz test bölümlerini seçin
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {testSections.map((s) => {
              const Icon = s.icon;
              const available = s.tests && s.tests.length > 0;
              const selected = !!selectedMap[s.id];
              const testCount = s.tests?.length || 0;
              const duration = s.id === "listening" ? "30-40 dk" :
                               s.id === "reading" ? "60 dk" :
                               s.id === "writing" ? "60 dk" :
                               "11-14 dk";
              
              return (
                <button
                  key={s.id}
                  onClick={() => available && toggle(s.id)}
                  disabled={!available}
                  className={`w-full text-left p-3 rounded-lg border focus:outline-none focus:ring-0 ${
                    selected 
                      ? "bg-red-50 border-red-500 border-2 shadow-sm transition-all" 
                      : "bg-white border-gray-200 border"
                  } ${!available ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        selected ? "bg-red-500" : "bg-gray-100"
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          selected ? "text-white" : "text-gray-600"
                        }`} />
                      </div>
                      <div>
                        <div className={`font-bold text-sm uppercase ${
                          selected ? "text-red-600" : "text-gray-900"
                        }`}>
                          {s.title}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${
                          selected ? "text-red-500" : "text-gray-600"
                        }`}>
                          {duration} • {testCount} test
                        </div>
                      </div>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      selected 
                        ? "bg-red-500 text-white" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        selected ? "bg-white/30" : "bg-gray-200"
                      }`}>
                        <span className={`text-[9px] font-bold ${
                          selected ? "text-white" : "text-gray-600"
                        }`}>K</span>
                      </div>
                      <span className="text-xs font-medium">{s.cost} kredi</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-700 mb-0.5">Toplam Maliyet</div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-gray-900">{totalCoins}</span>
                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-gray-700">K</span>
                </div>
              </div>
              <a href="#" className="text-[10px] text-gray-500 hover:text-gray-700 mt-0.5 inline-block">
                Kredi nedir?
              </a>
            </div>
            <Button
              className="h-9 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCta}
              disabled={totalCoins === 0}
            >
              <span className="flex items-center gap-1.5">
                {isAuthenticated ? "Teste Başla" : "Başlamak İçin Kayıt Ol"}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestModal;
