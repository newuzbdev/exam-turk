import { useState, useEffect } from "react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import TestModal from "./components/TestModal";
import MainTestCard from "./components/MainTestCard";
import EmptyState from "./components/EmptyState";
import { useLocation } from "react-router-dom";

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
        toast.error("Türkçe testleri yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    fetchTurkishTestData();
  }, [location.state]);

  const getTestImage = () => {
    // Default image for main tests - Modern digital learning
    return "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop&auto=format";
  };

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



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="mb-12 text-center">
              <div className="h-10 bg-gray-200 rounded w-80 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
            
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            IELTS Practice Tests
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a test to begin your IELTS practice session. Each test includes all four sections: Listening, Reading, Writing, and Speaking.
          </p>
        </div>

        {/* Test Cards */}
        <div>
          {turkishTestData?.ieltsData &&
          turkishTestData.ieltsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {turkishTestData.ieltsData.map((test) => (
                <MainTestCard
                  key={test.id}
                  test={test}
                  onTestStart={handleTestModalOpen}
                  getTestImage={getTestImage}
                  formatDate={formatDate}
                  availableTestTypes={getAvailableTestTypes(test.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState selectedTestType="all" isMainTestSelection={true} />
          )}
        </div>

        {/* Test Selection Modal */}
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
