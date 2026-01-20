import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BookOpen, Brain, Target, Crown } from "lucide-react";

interface LanguageProgress {
  vocabulary: {
    currentLevel: string;
    progress: number;
    nextLevel: string;
  };
  grammar: {
    currentLevel: string;
    progress: number;
    nextLevel: string;
  };
}

interface Level {
  name: string;
  description: string;
  points: number;
  color: string;
}

interface LanguageProgressProps {
  languageProgress: LanguageProgress;
  animatedProgress: { vocab: number; grammar: number };
  levels: Level[];
}

const LanguageProgressSection = ({
  languageProgress,
  animatedProgress,
  levels,
}: LanguageProgressProps) => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const isLevelUnlocked = (level: string, currentLevel: string) => {
    const levelIndex = levels.findIndex((l) => l.name === level);
    const currentIndex = levels.findIndex((l) => l.name === currentLevel);
    return levelIndex <= currentIndex;
  };

  return (
    <Card className="border-0 shadow-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white p-8">
        <CardTitle className="flex items-center gap-3 text-2xl font-bold">
          <TrendingUp className="w-7 h-7" />
          Türkçe Dil Ustalığı
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 bg-gradient-to-br from-white to-red-50">
        {/* Current Levels */}
        <div className="grid lg:grid-cols-2 gap-10 mb-12">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-gray-900">
                    Kelime Bilgisi
                  </span>
                  <p className="text-gray-600">
                    Kelime dağarcığınızı geliştirin
                  </p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 text-lg font-bold shadow-lg">
                {languageProgress.vocabulary.currentLevel}
              </Badge>
            </div>
            <div className="space-y-3">
              <Progress
                value={animatedProgress.vocab}
                className="h-4 bg-gray-200 shadow-inner"
              />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700">
                  {languageProgress.vocabulary.nextLevel} seviyesine{" "}
                  {animatedProgress.vocab}%
                </span>
                <span className="text-red-600 font-bold">
                  {Math.round(animatedProgress.vocab * 10)} / 1000 XP
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-gray-900">
                    Dilbilgisi
                  </span>
                  <p className="text-gray-600">Dil yapısını öğrenin</p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 text-lg font-bold shadow-lg">
                {languageProgress.grammar.currentLevel}
              </Badge>
            </div>
            <div className="space-y-3">
              <Progress
                value={animatedProgress.grammar}
                className="h-4 bg-gray-200 shadow-inner"
              />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700">
                  {languageProgress.grammar.nextLevel} seviyesine{" "}
                  {animatedProgress.grammar}%
                </span>
                <span className="text-red-600 font-bold">
                  {Math.round(animatedProgress.grammar * 10)} / 1000 XP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progression */}
        <div className="space-y-8">
          <h3 className="font-bold text-2xl flex items-center gap-3 text-gray-900">
            <Target className="w-6 h-6 text-red-600" />
            Öğrenme Yolculuğu
          </h3>
          <div className="relative bg-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-between overflow-x-auto pb-6">
              {levels.map((level, index) => {
                const isUnlocked = isLevelUnlocked(
                  level.name,
                  languageProgress.vocabulary.currentLevel
                );
                const isCurrent =
                  level.name === languageProgress.vocabulary.currentLevel;
                const isSelected = selectedLevel === level.name;

                return (
                  <div
                    key={level.name}
                    className="flex flex-col items-center gap-4 min-w-0 "
                  >
                    <div
                      className={`
                        relative w-20 h-20 mt-5 rounded-full flex items-center justify-center text-lg font-bold cursor-pointer
                        ${
                          isCurrent
                            ? `bg-gradient-to-br ${level.color} text-white ring-4 ring-red-300 shadow-2xl animate-pulse`
                            : isUnlocked
                            ? `bg-gradient-to-br ${level.color} text-white shadow-xl`
                            : "bg-gray-200 text-gray-400"
                        }
                        ${isSelected ? "ring-4 ring-red-400" : ""}
                      `}
                      onClick={() =>
                        setSelectedLevel(isSelected ? null : level.name)
                      }
                    >
                      {level.name}
                      {isCurrent && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                          <Crown className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {level.description}
                      </p>
                      <p className="text-sm bg-red-100 rounded-full px-3 py-1 text-red-600 font-semibold mt-1 inline-block">
                        {level.points} puan
                      </p>
                    </div>
                    {index < levels.length - 1 && (
                      <div
                        className={`absolute top-10 left-1/2 w-full h-2 -translate-x-1/2 rounded-full ${
                          isUnlocked
                            ? "bg-gradient-to-r from-red-400 to-red-500"
                            : "bg-gray-200"
                        }`}
                        style={{ zIndex: -1 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {selectedLevel && (
              <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-white rounded-xl border-2 border-red-200 animate-in slide-in-from-bottom duration-300">
                <h4 className="font-bold text-xl text-red-700 mb-2">
                  Seviye {selectedLevel} -{" "}
                  {levels.find((l) => l.name === selectedLevel)?.description}
                </h4>
                <p className="text-gray-700">
                  Bu seviyeyi düzenli pratik ve test performansı ile{" "}
                  {levels.find((l) => l.name === selectedLevel)?.points} puan
                  kazanarak açabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguageProgressSection;
