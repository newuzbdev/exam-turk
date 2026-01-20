import { useState, useEffect } from "react";
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

const TestPage = () => {
  const [turkishTestData, setTurkishTestData] = useState<TurkishTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [_selectedTest, setSelectedTest] = useState<TurkishTest | null>(null);
  const [_selectedTestType, setSelectedTestType] = useState<TestType>("all");
  const [showTestModal, setShowTestModal] = useState(false);
  const [currentTestForModal, setCurrentTestForModal] = useState<TurkishTest | null>(null);
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

  const handleTestModalOpen = (test: TurkishTest) => {
    setCurrentTestForModal(test);
    setShowTestModal(true);
  };

  const handleTestTypeClick = (testType: string, tests: any[]) => {
    console.log(`Selected test type: ${testType}`, tests);
  };

  // --- Loading Skeleton ---
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-gray-900">
        {/* Header Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="h-10 bg-gray-100 rounded w-32 mb-3 mx-auto animate-pulse"></div>
              <div className="h-5 bg-gray-50 rounded w-80 mx-auto animate-pulse"></div>
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
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Testler
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Seviyenizi ölçmek için bir test paketi seçin
            </p>
          </div>
        </div>
      </div>

      {/* Tests Grid Section */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {turkishTestData?.ieltsData && turkishTestData.ieltsData.length > 0 ? (
              [...turkishTestData.ieltsData]
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
                .map((test) => {
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
                        {hasTests ? "Mevcut testler:" : "Erişime Kapalı"}
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
