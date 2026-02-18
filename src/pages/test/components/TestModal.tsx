import { BookOpen, Headphones, Pencil, X, Coins, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import overallTestService, { overallTestFlowStore } from "@/services/overallTest.service";
import { toast } from "sonner";
import testCoinPriceService from "@/services/testCoinPrice.service";
import type { TestCoinPriceItem } from "@/services/testCoinPrice.service";
import TestConfirmationModal from "./TestConfirmationModal";
import AuthModal from "@/components/auth/AuthModal";

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

  // selection state - start with empty selection
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedSkills([]);
      setShowConfirmationModal(false);
    }
  }, [open]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId) 
        : [...prev, skillId]
    );
  };


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

  const skillsData = [
    { 
      id: 'listening', 
      name: 'DİNLEME', 
      duration: '30–40 dk', 
      testCount: listeningTests.length > 0 ? `${listeningTests.length} test` : '0 test', 
      cost: coinByType["LISTENING"] ?? 2, 
      icon: Headphones 
    },
    { 
      id: 'reading', 
      name: 'OKUMA', 
      duration: '60 dk', 
      testCount: readingTests.length > 0 ? `${readingTests.length} test` : '0 test', 
      cost: coinByType["READING"] ?? 2, 
      icon: BookOpen 
    },
    { 
      id: 'writing', 
      name: 'YAZMA', 
      duration: '60 dk', 
      testCount: writingTests.length > 0 ? `${writingTests.length} test` : '0 test', 
      cost: coinByType["WRITING"] ?? 5, 
      icon: Pencil 
    },
    { 
      id: 'speaking', 
      name: 'KONUŞMA', 
      duration: '11–14 dk', 
      testCount: speakingTests.length > 0 ? `${speakingTests.length} test` : '0 test', 
      cost: coinByType["SPEAKING"] ?? 5, 
      icon: MessageCircle 
    },
  ];

  const totalCost = useMemo(() => {
    return selectedSkills.reduce((total, skillId) => {
      const skill = skillsData.find(s => s.id === skillId);
      return total + (skill ? skill.cost : 0);
    }, 0);
  }, [selectedSkills]);

  const handleCta = () => {
    if (selectedSkills.length === 0) {
      toast.error("Lütfen en az bir test bölümü seçin");
      return;
    }

    if (!isAuthenticated) {
      // Open auth modal in register mode instead of navigating
      setIsAuthModalOpen(true);
      return;
    }

    // Preflight coin check: redirect to pricing if not enough coins
    const userCoins = user?.coin ?? 0;
    if (userCoins < totalCost) {
      toast.error("Yetersiz kredi. Başlamak için lütfen daha fazla satın alın.");
      navigate(`/price?neededCoins=${totalCost - userCoins}`);
      return;
    }

    // Show confirmation modal instead of immediately starting
    setShowConfirmationModal(true);
  };

  const handleConfirmStart = async () => {
    // Determine selected tests and call overall start API first
    const readingId = selectedSkills.includes('reading') && readingTests?.[0]?.id ? readingTests[0].id : undefined;
    const listeningId = selectedSkills.includes('listening') && listeningTests?.[0]?.id ? listeningTests[0].id : undefined;
    const writingId = selectedSkills.includes('writing') && writingTests?.[0]?.id ? writingTests[0].id : undefined;
    const speakingId = selectedSkills.includes('speaking') && speakingTests?.[0]?.id ? speakingTests[0].id : undefined;

    // Yeni bir genel test oturumu başlatırken, daha önceki denemelerden kalan
    // yerel cevapları temizleyelim ki kullanıcı tertemiz bir testle başlasın.
    try {
      if (readingId) {
        sessionStorage.removeItem(`reading_answers_${readingId}`);
      }
      if (listeningId) {
        sessionStorage.removeItem(`listening_answers_${listeningId}`);
      }
      if (writingId) {
        sessionStorage.removeItem(`writing_answers_${writingId}`);
      }
      if (speakingId) {
        sessionStorage.removeItem(`speaking_answers_${speakingId}`);
      }
    } catch {
      // storage erişim hatalarını sessizce yoksay
    }

    // Close confirmation modal
    setShowConfirmationModal(false);

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
      selectedSkills.includes('listening') && listeningTests?.[0]?.id
        ? { testType: "LISTENING" as const, testId: listeningTests[0].id, path: `/listening-test/${listeningTests[0].id}` }
        : null,
      selectedSkills.includes('reading') && readingTests?.[0]?.id
        ? { testType: "READING" as const, testId: readingTests[0].id, path: `/reading-test/${readingTests[0].id}` }
        : null,
      selectedSkills.includes('writing') && writingTests?.[0]?.id
        ? { testType: "WRITING" as const, testId: writingTests[0].id, path: `/writing-test/${writingTests[0].id}` }
        : null,
      selectedSkills.includes('speaking') && speakingTests?.[0]?.id
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

    // Always show section-ready screen before first selected section
    const first = queue[0];
    if (first?.path) {
      overallTestFlowStore.setPendingNextSection({
        fromTestType: first.testType,
        next: first,
        totalCount: queue.length,
        completedCount: 0,
      });
      navigate("/overall-section-ready");
      return;
    }

    navigate("/test");
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false);
    // Don't deduct coins - just close the modal
  };

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      >
        <div 
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5"
          onClick={(e) => e.stopPropagation()}
        >
              
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedTest.title}</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Lütfen katılmak istediğiniz test bölümlerini seçiniz.
                    </p>
                  </div>
                  <button 
                    onClick={() => onOpenChange(false)} 
                    className="text-gray-400 hover:text-gray-800 transition-colors flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1 min-h-0">
                {skillsData.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.id);
                  const isAvailable = skill.testCount !== '0 test';
                  
                  return (
                    <div 
                      key={skill.id}
                      onClick={() => isAvailable && toggleSkill(skill.id)}
                      className={`group p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between gap-4 transition-all duration-300 min-h-[140px] ${
                        !isAvailable
                          ? 'opacity-50 cursor-not-allowed bg-gray-100/70 border-gray-200'
                          : isSelected
                            ? 'bg-red-600/10 border-red-600 text-red-600 cursor-pointer shadow-xl shadow-red-600/10 -translate-y-1'
                            : 'bg-gray-50/80 border-gray-300 text-gray-900 cursor-pointer hover:border-red-600 hover:shadow-2xl hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            isSelected
                              ? "bg-red-600/10"
                              : "bg-gray-100 group-hover:bg-red-600/10"
                          }`}
                        >
                          <skill.icon
                            className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              isSelected
                                ? "text-red-600"
                                : "text-gray-600 group-hover:text-red-600"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold uppercase tracking-wide text-sm sm:text-base truncate ${isSelected ? 'text-red-600' : 'group-hover:text-red-600'}`}>
                            {skill.name}
                          </p>
                          <p className={`text-xs font-medium ${isSelected ? 'text-red-600/80' : 'text-gray-500 group-hover:text-red-600/80'}`}>
                            {skill.duration} • {skill.testCount}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border-2 flex-shrink-0 ${isSelected ? 'bg-red-600/15 text-red-600 border-red-300' : 'bg-gray-50 text-gray-700 border-gray-300 group-hover:border-red-300 group-hover:text-red-600 group-hover:bg-red-600/5'}`}>
                        <Coins className={`w-3 h-3 sm:w-4 sm:h-4 ${isSelected ? 'text-red-600' : 'text-gray-600 group-hover:text-red-600'}`} />
                        <span>{skill.cost} kredi</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-gray-200 mt-auto bg-gray-50/50 rounded-b-xl sm:rounded-b-2xl flex-shrink-0 sticky bottom-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Toplam Maliyet</p>
                    <p className="text-xl sm:text-2xl font-bold font-serif text-gray-900 flex items-center gap-2">
                      {totalCost} <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                    </p>
                    <div className="relative group mt-2">
                      <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-800 transition-colors">
                        Kredi nedir?
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-56 sm:w-64 bg-[#1D1D1D] text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        Kredi, TurkishMock testlerine giriş yapmak için kullanılan dijital birimdir. Her test bölümü belirli miktarda kredi gerektirir.
                        <svg className="absolute left-4 -bottom-2 w-4 h-2 text-[#1D1D1D]" viewBox="0 0 16 8" fill="currentColor">
                          <path d="M0 8L8 0L16 8H0Z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleCta}
                    disabled={selectedSkills.length === 0}
                    className="w-full sm:w-auto bg-red-600 cursor-pointer text-white font-medium py-3 px-6 sm:px-8 rounded-lg shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-sm sm:text-base flex-shrink-0"
                  >
                    {isAuthenticated ? "Teste Başla →" : "Başlamak İçin Kayıt Ol →"}
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* Confirmation Modal */}
      <TestConfirmationModal
        open={showConfirmationModal}
        onOpenChange={setShowConfirmationModal}
        onConfirm={handleConfirmStart}
        onCancel={handleCancelConfirmation}
      />

      {/* Auth Modal */}
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        initialMode="register"
      />
    </>
  );
};

export default TestModal;
