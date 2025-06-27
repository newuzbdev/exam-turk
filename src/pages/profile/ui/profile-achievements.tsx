import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Trophy } from "lucide-react";

const achievements = [
  {
    name: "İlk Adımlar",
    description: "İlk dersi tamamladı",
    earned: true,
  },
  {
    name: "Düzenli Öğrenci",
    description: "7 günlük çalışma serisi",
    earned: true,
  },
  {
    name: "Kelime Ustası",
    description: "500 kelime öğrendi",
    earned: true,
  },
  {
    name: "Gramer Uzmanı",
    description: "Gramer testinde %90+",
    earned: false,
  },
];
const ProfileAchievements = () => {
  return (
    <div>
      <Card className="border-red-700 hover:border-red-800 bg-gradient-to-r from-red-500 to-red-700 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Başarılar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-lg ${
                  achievement.earned
                    ? "border-red-400 bg-red-500 bg-opacity-50"
                    : "border-red-600 bg-red-800 bg-opacity-30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      achievement.earned ? "bg-yellow-500" : "bg-gray-600"
                    }`}
                  >
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-1">
                      {achievement.name}
                    </h4>

                    <p className="text-sm text-gray-200">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileAchievements;
