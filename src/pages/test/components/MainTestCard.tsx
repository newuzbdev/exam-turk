import { BookOpen, Clock, Headphones, Mic, PenTool, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TestInstructionModal from "./TestInstructionModal";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface TurkishTest {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface WritingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface SpeakingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface ListeningTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface ReadingTest {
  id: string;
  title: string;
  ieltsId: string;
  type: string;
}

interface MainTestCardProps {
  test: TurkishTest;
  onTestStart: (test: TurkishTest) => void;
  getTestImage: () => string;
  formatDate: (dateString: string) => string;
  availableTestTypes: {
    writing: WritingTest[];
    speaking: SpeakingTest[];
    listening: ListeningTest[];
    reading: ReadingTest[];
  };
}

const MainTestCard = ({
  test,
  onTestStart,
  availableTestTypes,
}: MainTestCardProps) => {
  const getAvailableTypes = () => {
    const types = [];
    if (availableTestTypes.listening.length > 0) {
      types.push({
        name: "Listening",
        icon: Headphones,
        type: "listening",
      });
    }
    if (availableTestTypes.speaking.length > 0) {
      types.push({ name: "Speaking", icon: Mic, type: "speaking" });
    }
    if (availableTestTypes.reading.length > 0) {
      types.push({ name: "Reading", icon: BookOpen, type: "reading" });
    }
    if (availableTestTypes.writing.length > 0) {
      types.push({ name: "Writing", icon: PenTool, type: "writing" });
    }
    return types;
  };

  const availableTypes = getAvailableTypes();
  
  return (
    <Card 
      className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      onClick={() => onTestStart(test)}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3Ccircle cx="27" cy="7" r="1"/%3E%3Ccircle cx="47" cy="7" r="1"/%3E%3Ccircle cx="7" cy="27" r="1"/%3E%3Ccircle cx="27" cy="27" r="1"/%3E%3Ccircle cx="47" cy="27" r="1"/%3E%3Ccircle cx="7" cy="47" r="1"/%3E%3Ccircle cx="27" cy="47" r="1"/%3E%3Ccircle cx="47" cy="47" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      <CardContent className="relative p-8 h-64 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-sm font-medium opacity-90 mb-1">IELTS</div>
              <h2 className="text-3xl font-bold">{test.title}</h2>
            </div>
            <div className="bg-white/20 rounded-lg p-2">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Available Test Types */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium"
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{type.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <div className="text-sm opacity-90">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Full Test: 3h</span>
            </div>
          </div>
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/30">
            {availableTypes.length} Parts
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default MainTestCard;
