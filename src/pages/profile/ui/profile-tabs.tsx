import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const recentTests = [
  {
    type: "Dinleme Sınavı",
    level: "A2",
    date: "20 Aralık 2024",
    questions: 50,
    duration: "12 dakika",
  },
  {
    type: "Okuma Sınavı",
    level: "A2",
    date: "17 Aralık 2024",
    questions: 40,
    duration: "18 dakika",
  },
  {
    type: "Türkçe Yeterlilik Sınavı",
    level: "A2",
    date: "15 Aralık 2024",
    questions: 100,
    duration: "45 dakika",
  },
];

const ProfileTabs = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow-lg rounded-xl border-0 ">
        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 rounded-t-xl">
          <CardTitle className="flex items-center gap-3 text-xl">
            <TrendingUp className="w-6 h-6 text-red-500" />
            <span className="text-gray-800 py-2">Son Sınav Performansı</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-6">
            {recentTests.map((test, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-gray-800 hover:text-red-600 transition-colors">
                        {test.type}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>📅</span> {test.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span>❓</span> {test.questions} soru
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span>⏱️</span> {test.duration}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-50 text-red-700 px-3 py-1 text-sm font-medium rounded-full">
                          {test.level}
                        </Badge>
                        <Eye className="w-5 h-5 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default ProfileTabs;
