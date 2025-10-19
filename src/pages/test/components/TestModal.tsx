import { BookOpen, CheckCircle2, Coins, Headphones, Mic, PenTool, ArrowRight } from "lucide-react";
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
      <DialogContent className="max-w-2xl w-[95vw] bg-white text-gray-900 rounded-xl border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {selectedTest.title}
            </h2>
            <p className="text-gray-600 text-sm">
              Almak istediğiniz test bölümlerini seçin
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3">
            {testSections.map((s) => {
              const Icon = s.icon;
              const available = s.tests && s.tests.length > 0;
              const selected = !!selectedMap[s.id];
              const testCount = s.tests?.length || 0;
              
              return (
                <Card
                  key={s.id}
                  className={`transition-all duration-200 cursor-pointer transform hover:scale-105 focus:outline-none focus:ring-0 ${
                    selected 
                      ? "bg-red-100 border-gray-200 shadow-md" 
                      : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg"
                  } ${!available ? "opacity-50 cursor-not-allowed hover:scale-100" : ""}`}
                >
                  <button
                    className="w-full p-4 text-left cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                    onClick={() => available && toggle(s.id)}
                    disabled={!available}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            selected 
                              ? "bg-red-600 border-red-600 shadow-sm" 
                              : "border-gray-300 group-hover:border-gray-400"
                          }`}
                        >
                          {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </div>
                        <Icon className={`h-5 w-5 ${selected ? "text-red-600" : "text-gray-500"}`} />
                        <div>
                          <span className={`font-semibold text-base ${selected ? "text-red-900" : "text-gray-900"}`}>
                            {s.title}
                          </span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {s.id === "listening" ? "30-40 dk" :
                               s.id === "reading" ? "60 dk" :
                               s.id === "writing" ? "60 dk" :
                               "11-14 dk"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {testCount} test
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-amber-600">
                        <Coins className="h-4 w-4" />
                        <span className="font-medium text-sm">{s.cost}</span>
                      </div>
                    </div>
                  </button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-700 font-medium">Toplam Maliyet</span>
            <div className="flex items-center gap-1 text-amber-600">
              <Coins className="h-5 w-5" />
              <span className="text-lg font-semibold">{totalCoins}</span>
            </div>
          </div>

          <Button
            className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCta}
            disabled={totalCoins === 0}
          >
            <span className="flex items-center gap-2">
              {isAuthenticated ? "Teste Başla" : "Başlamak İçin Kayıt Ol"}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
          
          {!isAuthenticated && (
            <p className="text-center text-xs text-gray-500 mt-2">
              Teste katılmak için kayıt olmanız gerekiyor
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestModal;
