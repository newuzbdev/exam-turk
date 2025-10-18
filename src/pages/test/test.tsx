import { useState, useEffect } from "react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import TestModal from "./components/TestModal";
import MainTestCard from "./components/MainTestCard";
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-40 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Merkezi</h1>
        </div>

        {/* Test Cards with Modal */}
        <div>
          
          {turkishTestData?.ieltsData &&
          turkishTestData.ieltsData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
