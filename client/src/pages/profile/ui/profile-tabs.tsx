import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TrendingUp, Eye } from "lucide-react";
import { Progress } from "@radix-ui/react-progress";
import { Badge } from "@/components/ui/badge";

const recentTests = [
  {
    type: "Dinleme Sınavı",
    score: 85,
    level: "A2",
    date: "20 Aralık 2024",
    questions: 50,
    duration: "12 dakika",
  },
  {
    type: "Okuma Sınavı",
    score: 78,
    level: "A2",
    date: "17 Aralık 2024",
    questions: 40,
    duration: "18 dakika",
  },
  {
    type: "Türkçe Yeterlilik Sınavı",
    score: 82,
    level: "A2",
    date: "15 Aralık 2024",
    questions: 100,
    duration: "45 dakika",
  },
];

const ProfileTabs = () => {
  return (
    <div>
      <Card className="border-red-100 hover:border-red-200  transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            Son Sınav Performansı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTests.map((test, index) => (
              <div
                key={index}
                className="p-4 border border-red-100 rounded-lg hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1 group-hover:text-red-700 transition-colors">
                      {test.type}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{test.date}</span>
                      <span>•</span>
                      <span>{test.questions} soru</span>
                      <span>•</span>
                      <span>{test.duration}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {test.score}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 border border-red-200">
                        {test.level}
                      </Badge>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <Eye className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-600" />
                    </div>
                  </div>
                </div>
                <Progress value={test.score} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTabs;
