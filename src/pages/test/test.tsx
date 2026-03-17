import { useEffect, useMemo, useState } from "react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import TestModal from "./components/TestModal";
import EmptyState from "./components/EmptyState";
import { useLocation } from "react-router-dom";
import { authService } from "@/services/auth.service";

// --- Interfaces ---
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

interface TurkishTestResponse {
  total: number;
  page: number;
  limit: number;
  ieltsData: TurkishTest[];
  writingTests: WritingTest[];
  speakingTests: SpeakingTest[];
  listeningTests: ListeningTest[];
  readingTests: ReadingTest[];
}

type TestType = "all" | "listening" | "speaking" | "reading" | "writing";
type PackageTab = "cefr" | "speaking";

const normalizePackageTitle = (value: string) =>
  String(value || "")
    .toUpperCase()
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/İ/g, "I")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/\s+/g, " ")
    .trim();

const getPackageTab = (title: string): PackageTab => {
  const normalized = normalizePackageTitle(title);
  if (normalized.includes("KONUSMA") || normalized.includes("SPEAKING")) {
    return "speaking";
  }
  return "cefr";
};

const TestPage = () => {
  const [turkishTestData, setTurkishTestData] = useState<TurkishTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [_selectedTest, setSelectedTest] = useState<TurkishTest | null>(null);
  const [_selectedTestType, setSelectedTestType] = useState<TestType>("all");
  const [showTestModal, setShowTestModal] = useState(false);
  const [currentTestForModal, setCurrentTestForModal] = useState<TurkishTest | null>(null);
  const [selectedPackageTab, setSelectedPackageTab] = useState<PackageTab>("cefr");
  const location = useLocation();

  useEffect(() => {
    const fetchTurkishTestData = async () => {
      try {
        const response = await axiosPrivate.get("/api/ielts");
        setTurkishTestData(response.data);

        if (location.state) {
          const { selectedTestId, selectedTestType: navTestType } = location.state;
          if (selectedTestId && navTestType && response.data) {
            const test = response.data.ieltsData.find((t: TurkishTest) => t.id === selectedTestId);
            if (test) {
              setSelectedTest(test);
              setSelectedTestType(navTestType as TestType);
            }
          }
        }
      } catch (error: any) {
        console.error("Error fetching Turkish test data:", error);
        const { accessToken } = authService.getStoredTokens();
        if (accessToken) {
          toast.error("Sınavlar yüklenirken bir sorun oluştu.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTurkishTestData();
  }, [location.state]);

  const getAvailableTestTypes = (testId: string) => {
    if (!turkishTestData)
      return { writing: [], speaking: [], listening: [], reading: [] };

    return {
      writing: turkishTestData.writingTests.filter((t) => t.ieltsId === testId),
      speaking: turkishTestData.speakingTests.filter((t) => t.ieltsId === testId),
      listening: turkishTestData.listeningTests.filter((t) => t.ieltsId === testId),
      reading: turkishTestData.readingTests.filter((t) => t.ieltsId === testId),
    };
  };

  const sortedPackages = useMemo(() => {
    const list = turkishTestData?.ieltsData || [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [turkishTestData?.ieltsData]);

  const cefrPackages = useMemo(
    () => sortedPackages.filter((test) => getPackageTab(test.title) === "cefr"),
    [sortedPackages],
  );
  const speakingPackages = useMemo(
    () => sortedPackages.filter((test) => getPackageTab(test.title) === "speaking"),
    [sortedPackages],
  );

  useEffect(() => {
    if (selectedPackageTab === "cefr" && cefrPackages.length === 0 && speakingPackages.length > 0) {
      setSelectedPackageTab("speaking");
      return;
    }
    if (selectedPackageTab === "speaking" && speakingPackages.length === 0 && cefrPackages.length > 0) {
      setSelectedPackageTab("cefr");
    }
  }, [selectedPackageTab, cefrPackages.length, speakingPackages.length]);

  const handleTestModalOpen = (test: TurkishTest) => {
    setCurrentTestForModal(test);
    setShowTestModal(true);
  };

  const handleTestTypeClick = (testType: string, tests: any[]) => {
    console.log(`Selected test type: ${testType}`, tests);
  };

  const activePackages = selectedPackageTab === "cefr" ? cefrPackages : speakingPackages;
  const hasAnyPackages = sortedPackages.length > 0;

  // --- Loading Skeleton ---
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-gray-900">
        {/* Header Section */}
        <div className="py-10 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto">
              <div className="h-5 w-28 bg-gray-100 rounded-full mb-3 mx-auto animate-pulse"></div>
              <div className="h-8 bg-gray-100 rounded w-36 mb-2 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gray-50 rounded w-72 mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Tests Grid Section */}
        <section className="py-16 bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8 h-64 animate-pulse">
                  <div className="h-8 bg-gray-100 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-50 rounded w-1/2 mb-8"></div>
                  <div className="mt-auto flex gap-2">
                    <div className="h-7 w-20 bg-gray-50 rounded-lg"></div>
                    <div className="h-7 w-20 bg-gray-50 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* Header Section */}
      <div className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left max-w-2xl pl-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5">
              Testler
            </h1>
            <p className="text-gray-600 text-[15px]">
              Seviyenizi ölçmek için bir test paketi seçin
            </p>
          </div>
        </div>
      </div>

      {/* Tests Grid Section */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {hasAnyPackages && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPackageTab("cefr")}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedPackageTab === "cefr"
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:text-red-600"
                }`}
              >
                CEFR Paketleri ({cefrPackages.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPackageTab("speaking")}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedPackageTab === "speaking"
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:text-red-600"
                }`}
              >
                Konuşma Paketleri ({speakingPackages.length})
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasAnyPackages ? (
              activePackages.length > 0 ? (
                activePackages.map((test) => {
                const availableTypes = getAvailableTestTypes(test.id);
                const hasTests =
                  availableTypes.writing.length > 0 ||
                  availableTypes.speaking.length > 0 ||
                  availableTypes.listening.length > 0 ||
                  availableTypes.reading.length > 0;

                return (
                  <button
                    key={test.id}
                    onClick={() => hasTests && handleTestModalOpen(test)}
                    disabled={!hasTests}
                    className={`group relative flex flex-col justify-between items-start text-left bg-white rounded-3xl border p-8 transition-all duration-300 h-full ${
                      hasTests
                        ? "border-gray-200 hover:border-red-600 hover:ring-1 hover:ring-red-600 hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                        : "border-gray-100 opacity-60 cursor-not-allowed bg-gray-50"
                    }`}
                  >
                    <div className="w-full">
                      {/* Title */}
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                        {test.title}
                      </h2>

                      {/* Description or Status */}
                      <p className="text-sm text-gray-500 mb-4">
                        {hasTests ? "Mevcut testler:" : "Hazırlanıyor..."}
                      </p>
                    </div>

                    {/* Features / Badges */}
                    {hasTests && (
                      <div className="mt-auto flex flex-wrap gap-2 w-full">
                        {availableTypes.listening.length > 0 && (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                            Dinleme
                          </span>
                        )}
                        {availableTypes.reading.length > 0 && (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                            Okuma
                          </span>
                        )}
                        {availableTypes.writing.length > 0 && (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                            Yazma
                          </span>
                        )}
                        {availableTypes.speaking.length > 0 && (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                            Konuşma
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white/80 p-8 text-center">
                  <p className="text-base font-semibold text-gray-700">
                    {selectedPackageTab === "cefr"
                      ? "CEFR paketi bulunamadı."
                      : "Konuşma paketi bulunamadı."}
                  </p>
                </div>
              )
            ) : (
              <div className="col-span-full">
                 <EmptyState selectedTestType="all" isMainTestSelection={true} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Test Modal */}
      {currentTestForModal && (
        <TestModal
          open={showTestModal}
          onOpenChange={setShowTestModal}
          selectedTest={currentTestForModal}
          isSpeakingPackage={getPackageTab(currentTestForModal.title) === "speaking"}
          writingTests={turkishTestData?.writingTests.filter(t => t.ieltsId === currentTestForModal.id) || []}
          speakingTests={turkishTestData?.speakingTests.filter(t => t.ieltsId === currentTestForModal.id) || []}
          listeningTests={turkishTestData?.listeningTests.filter(t => t.ieltsId === currentTestForModal.id) || []}
          readingTests={turkishTestData?.readingTests.filter(t => t.ieltsId === currentTestForModal.id) || []}
          onTestTypeClick={handleTestTypeClick}
        />
      )}
    </div>
  );
};

export default TestPage;
