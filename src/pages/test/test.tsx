import { useState, useEffect } from "react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import TestModal from "./components/TestModal";
import EmptyState from "./components/EmptyState";
import { useLocation, } from "react-router-dom";
import { authService } from "@/services/auth.service";

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
  const [turkishTestData, setTurkishTestData] =
    useState<TurkishTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [_selectedTest, setSelectedTest] = useState<TurkishTest | null>(null);
  const [_selectedTestType, setSelectedTestType] = useState<TestType>("all");
  const [showTestModal, setShowTestModal] = useState(false);
  const [currentTestForModal, setCurrentTestForModal] = useState<TurkishTest | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchTurkishTestData = async () => {
      try {
        const response = await axiosPrivate.get("/api/ielts");
        console.log("IELTS IDs:", response.data.ieltsData.map((t: any) => t.id));
        console.log("Writing test ieltsIds:", response.data.writingTests.map((t: any) => `${t.title}: ${t.ieltsId}`));
        setTurkishTestData(response.data);
        
        // Handle navigation state for direct navigation
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
          toast.error("Türkçe testleri yüklenemedi");
        } else {
          // Unauthenticated visitor; suppress toast and token-required requests
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
      speaking: turkishTestData.speakingTests.filter(
        (t) => t.ieltsId === testId
      ),
      listening: turkishTestData.listeningTests.filter(
        (t) => t.ieltsId === testId
      ),
      reading: turkishTestData.readingTests.filter((t) => t.ieltsId === testId),
    };
  };



  const handleTestModalOpen = (test: TurkishTest) => {
    setCurrentTestForModal(test);
    setShowTestModal(true);
  };

  const handleTestTypeClick = (testType: string, tests: any[]) => {
    console.log(`Selected test type: ${testType}`, tests);
    // Handle navigation to specific test type
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 bg-gray-200 rounded-full"></div>
                <div className="h-8 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-64 ml-4"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 min-h-[140px] md:min-h-[160px] flex items-center justify-center">
                  <div className="text-center w-full">
                    <div className="h-12 bg-gray-200 rounded mb-2 mx-auto w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with red vertical bar */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-red-600 rounded-full"></div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Test Seçimi
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-4">
            Başlamak istediğiniz testi seçin
          </p>
        </div>

        {/* Test Cards with Modal */}
        <div>
          {turkishTestData?.ieltsData &&
          turkishTestData.ieltsData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {turkishTestData.ieltsData.map((test) => {
                const isSelected = selectedTestId === test.id;
                const availableTypes = getAvailableTestTypes(test.id);
                const hasTests = 
                  availableTypes.writing.length > 0 ||
                  availableTypes.speaking.length > 0 ||
                  availableTypes.listening.length > 0 ||
                  availableTypes.reading.length > 0;

                return (
                  <div
                    key={test.id}
                    onClick={() => hasTests && handleTestModalOpen(test)}
                    className={`
                      relative cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-2 border-red-600 shadow-md' 
                        : 'border border-gray-200 hover:border-gray-300'
                      }
                      ${!hasTests ? 'opacity-50 cursor-not-allowed' : ''}
                      bg-white rounded-lg p-6 md:p-8
                      flex flex-col items-center justify-center
                      min-h-[140px] md:min-h-[160px]
                    `}
                    onMouseEnter={() => setSelectedTestId(test.id)}
                    onMouseLeave={() => setSelectedTestId(null)}
                  >
                    <div className="text-center">
                      <div className={`text-4xl md:text-5xl font-bold mb-2 ${
                        isSelected ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {test.title}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 uppercase tracking-wide">
                        {hasTests ? 'Test Mevcut' : 'Test Yok'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState selectedTestType="all" isMainTestSelection={true} />
          )}
        </div>

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
    </div>
  );
};

export default TestPage;
