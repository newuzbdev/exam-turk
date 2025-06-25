import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@radix-ui/react-progress";
import { Badge, BookOpen, Brain } from "lucide-react";
import { useState } from "react";
import ProfileFriendList from "./profile-friend-list";

const languageProgress = {
  vocabulary: {
    currentLevel: "A2",
    progress: 75,
    nextLevel: "B1",
    totalWords: 1250,
    targetWords: 2000,
  },
  grammar: {
    currentLevel: "A2",
    progress: 60,
    nextLevel: "B1",
    completedTopics: 18,
    totalTopics: 30,
  },
};

const getProgressColor = (value: number) => {
  if (value >= 75) return "bg-green-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

const ProfileProgressOverview = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [animatedProgress, setAnimatedProgress] = useState({
    vocab: 0,
    grammar: 0,
  }); // Mock data for the profile

  return (
    <div>
      <div className="flex justify-between items-center">
        <p className="font-bold text-lg py-3">İlerleme</p>
        <p className="font-bold text-lg py-3">Arkadaşlar</p>{" "}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-100 hover:border-red-200 transition-all duration-300 h-[180px]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="w-4 h-4 text-red-600" />
                Kelime Bilgisi İlerlemesi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Mevcut Seviye
                </span>
                <Badge className="bg-red-100 text-red-800 border border-red-200">
                  {languageProgress.vocabulary.currentLevel}
                </Badge>
              </div>
              <Progress
                value={animatedProgress.vocab}
                className={`h-1.5 ${getProgressColor(animatedProgress.vocab)}`}
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {languageProgress.vocabulary.nextLevel} seviyesine %
                  {animatedProgress.vocab}
                </span>
                <span>
                  {languageProgress.vocabulary.totalWords} /{" "}
                  {languageProgress.vocabulary.targetWords} kelime
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-100 hover:border-red-200 transition-all duration-300 h-[180px]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-4 h-4 text-red-600" />
                Gramer İlerlemesi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Mevcut Seviye
                </span>
                <Badge className="bg-red-100 text-red-800 border border-red-200">
                  {languageProgress.grammar.currentLevel}
                </Badge>
              </div>
              <Progress
                value={animatedProgress.grammar}
                className={`h-1.5 ${getProgressColor(
                  animatedProgress.grammar
                )}`}
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {languageProgress.grammar.nextLevel} seviyesine %
                  {animatedProgress.grammar}
                </span>
                <span>
                  {languageProgress.grammar.completedTopics} /{" "}
                  {languageProgress.grammar.totalTopics} konu
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <ProfileFriendList />
        </div>
      </div>
    </div>
  );
};
export default ProfileProgressOverview;
