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
      <div className="flex flex-col min-h-screen bg-gray-50 font-sans text-gray-900">
        <div className="flex-grow py-12">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="mb-12 animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 min-h-[160px] flex items-center justify-center">
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
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans text-gray-900">
      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="mb-12">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900">Test Seçimi</h1>
            <p className="text-gray-500 mt-2 font-light">Katılmak istediğiniz sınavı seçin</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {turkishTestData?.ieltsData &&
            turkishTestData.ieltsData.length > 0 ? (
              turkishTestData.ieltsData.map((test) => {
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
                    className={`group bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                      !hasTests ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <h2 className="text-2xl font-bold font-serif text-gray-900 mb-2">{test.title}</h2>
                    <p className={`text-sm font-medium transition-colors ${
                      hasTests 
                        ? 'text-gray-400 group-hover:text-red-600' 
                        : 'text-gray-400'
                    }`}>
                      {hasTests ? 'TEST MEVCUT' : 'TEST YOK'}
                    </p>
                  </button>
                );
              })
            ) : (
              <EmptyState selectedTestType="all" isMainTestSelection={true} />
            )}
          </div>
        </div>
      </main>

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
