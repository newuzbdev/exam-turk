import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import TestTypeSelector from "./components/TestTypeSelector";
import MainTestCard from "./components/MainTestCard";
import SubTestCard from "./components/SubTestCard";
import EmptyState from "./components/EmptyState";
import { BookOpen, } from "lucide-react";
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
  const [selectedTest, setSelectedTest] = useState<TurkishTest | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<TestType>("all");
  const location = useLocation();

  useEffect(() => {
    const fetchTurkishTestData = async () => {
      try {
        const response = await axiosPrivate.get("/api/ielts");
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

  const getTestTypeImage = (testType: string) => {
    switch (testType.toLowerCase()) {
      case "listening":
        // Professional headphones for listening tests
        return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop&auto=format";
      case "speaking":
        // Modern microphone setup for speaking tests
        return "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=250&fit=crop&auto=format";
      case "reading":
        // Academic books and reading materials
        return "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop&auto=format";
      case "writing":
      case "academic":
        // Professional writing setup with pen and notebook
        return "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=250&fit=crop&auto=format";
      default:
        // Modern learning environment
        return "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop&auto=format";
    }
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

  const getFilteredSubTests = () => {
    if (!selectedTest || !turkishTestData) return [];

    switch (selectedTestType) {
      case "listening":
        return turkishTestData.listeningTests.filter(
          (t) => t.ieltsId === selectedTest.id
        );
      case "speaking":
        return turkishTestData.speakingTests.filter(
          (t) => t.ieltsId === selectedTest.id
        );
      case "reading":
        return turkishTestData.readingTests.filter(
          (t) => t.ieltsId === selectedTest.id
        );
      case "writing":
        return turkishTestData.writingTests.filter(
          (t) => t.ieltsId === selectedTest.id
        );
      case "all":
      default:
        return [
          ...turkishTestData.writingTests.filter(
            (t) => t.ieltsId === selectedTest.id
          ),
          ...turkishTestData.speakingTests.filter(
            (t) => t.ieltsId === selectedTest.id
          ),
          ...turkishTestData.listeningTests.filter(
            (t) => t.ieltsId === selectedTest.id
          ),
          ...turkishTestData.readingTests.filter(
            (t) => t.ieltsId === selectedTest.id
          ),
        ];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 ">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Türkçe Testleri
          </h1>
          <p className="text-gray-600">
            Toplam {turkishTestData?.total || 0} test bulundu
          </p>
        </div>

        {/* Step 1: Main Test Selection */}
        {!selectedTest ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Test Seçin
            </h2>
            {turkishTestData?.ieltsData &&
            turkishTestData.ieltsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {turkishTestData.ieltsData.map((test) => (
                  <MainTestCard
                    key={test.id}
                    test={test}
                    onSelect={setSelectedTest}
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
        ) : (
          /* Step 2: Test Type Selection and Sub-tests */
          <div>
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTest(null);
                  setSelectedTestType("all");
                }}
                className="mb-4"
              >
                ← Geri Dön
              </Button>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {selectedTest.title}
              </h2>
              <p className="text-gray-600">Test türünü seçin ve başlayın</p>
            </div>

            {/* Test Type Selection */}
            <TestTypeSelector
              selectedTestType={selectedTestType}
              setSelectedTestType={setSelectedTestType}
            />

            {/* Work All Tests Card - Only show for "all" test type */}
            {selectedTestType === "all" && (
              <div className="mb-8">
                <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-xl p-8 shadow-xl border-0 hover:shadow-2xl transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 rounded-full p-3">
                        <BookOpen className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">
                          Tüm Testleri Çöz
                        </h3>
                        <p className="text-red-100 text-lg">
                          Full Test Deneyimi
                        </p>
                      </div>
                    </div>
                    <Button
                      className="bg-white text-red-700 hover:bg-red-50 px-8 py-3 font-bold text-lg rounded-lg shadow-lg"
                      onClick={() => {
                        // Handle work all tests functionality
                        console.log("Work all tests clicked");
                      }}
                    >
                      Başla
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tests Grid - Only show when NOT "all" */}
            {selectedTestType !== "all" && getFilteredSubTests().length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {getFilteredSubTests().map((subTest) => (
                  <SubTestCard
                    key={subTest.id}
                    subTest={subTest}
                    getTestTypeImage={getTestTypeImage}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
            
            {/* Empty state - Only show when NOT "all" */}
            {selectedTestType !== "all" && getFilteredSubTests().length === 0 && (
              <EmptyState selectedTestType={selectedTestType} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPage;
