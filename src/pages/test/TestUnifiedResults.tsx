import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestUnifiedResults() {
  const navigate = useNavigate();
  const [testId, setTestId] = useState("test123");

  const handleTestUnifiedResults = () => {
    navigate(`/unified-results/${testId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Test Unified Results Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                This page allows you to test the unified results page with tabs for all test types.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Note: This is a demo page. In a real scenario, you would navigate here from completed test results.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test ID (for demo purposes):
                </label>
                <input
                  type="text"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter test ID"
                />
              </div>

              <Button
                onClick={handleTestUnifiedResults}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
              >
                View Unified Results
              </Button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Features:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 4 tabs for Listening, Reading, Writing, and Speaking</li>
                <li>• Each tab shows the respective test results</li>
                <li>• Score badges on tab labels</li>
                <li>• Responsive design for mobile and desktop</li>
                <li>• Consistent UI across all test types</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/test")}
                className="px-6"
              >
                Back to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
