import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Badge,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  Lock,
  MapPin,
  Play,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import ProfileFriendList from "./profile-friend-list";

interface LearningLocation {
  id: string;
  level: string;
  name: string;
  description: string;
  requiredPoints: number;
  completed: boolean;
  current: boolean;
  locked: boolean;
  position: { x: number; y: number };
  stars: number;
  estimatedHours: number;
  topics: string[];
}
const renderPath = (from: LearningLocation, to: LearningLocation) => {
  const isActive = from.completed;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <line
        x1={`${from.position.x}%`}
        y1={`${from.position.y}%`}
        x2={`${to.position.x}%`}
        y2={`${to.position.y}%`}
        stroke={isActive ? "#8b5cf6" : "#e5e7eb"}
        strokeWidth={isActive ? "3" : "2"}
        strokeDasharray={isActive ? "none" : "6,4"}
        className="transition-all duration-500"
      />
    </svg>
  );
};

const learningJourney: LearningLocation[] = [
  {
    id: "a1",
    level: "A1",
    name: "Temel",
    description: "Türkçe dilinin temellerini öğrenin",
    requiredPoints: 500,
    completed: true,
    current: false,
    locked: false,
    position: { x: 18, y: 75 },
    stars: 5,
    estimatedHours: 40,
    topics: ["Temel Kelimeler", "Selamlaşma", "Sayılar", "Telaffuz"],
  },
  {
    id: "a2",
    level: "A2",
    name: "İletişim",
    description: "Günlük konuşma becerilerini geliştirin",
    requiredPoints: 1000,
    completed: false,
    current: true,
    locked: false,
    position: { x: 35, y: 55 },
    stars: 3,
    estimatedHours: 60,
    topics: ["Günlük Rutinler", "Alışveriş", "Aile", "Geçmiş Zaman"],
  },
  {
    id: "b1",
    level: "B1",
    name: "İfade",
    description: "Karmaşık fikirleri akıcı şekilde ifade edin",
    requiredPoints: 2000,
    completed: false,
    current: false,
    locked: true,
    position: { x: 52, y: 35 },
    stars: 0,
    estimatedHours: 80,
    topics: ["Görüşler", "Seyahat", "İş", "Gelecek Planları"],
  },
  {
    id: "b2",
    level: "B2",
    name: "Ustalık",
    description: "Gelişmiş tartışmalar ve resmi yazım",
    requiredPoints: 3500,
    completed: false,
    current: false,
    locked: true,
    position: { x: 69, y: 25 },
    stars: 0,
    estimatedHours: 100,
    topics: ["Tartışmalar", "Resmi Yazım", "Kültür", "Soyut Kavramlar"],
  },
  {
    id: "c1",
    level: "C1",
    name: "Uzmanlık",
    description: "Ana dile yakın yeterlilik ve akademik akıcılık",
    requiredPoints: 5000,
    completed: false,
    current: false,
    locked: true,
    position: { x: 82, y: 45 },
    stars: 0,
    estimatedHours: 120,
    topics: ["Akademik Türkçe", "Profesyonel", "Edebiyat", "İnce İfadeler"],
  },
  {
    id: "c2",
    level: "C2",
    name: "Mükemmellik",
    description: "Ana dil seviyesinde tam ustalık",
    requiredPoints: 7000,
    completed: false,
    current: false,
    locked: true,
    position: { x: 88, y: 15 },
    stars: 0,
    estimatedHours: 150,
    topics: [
      "Ana Dil Akıcılığı",
      "Öğretmenlik",
      "Kültürel Uzmanlık",
      "Mükemmel İfade",
    ],
  },
];
const ProfileLevelProgression = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedLevelInfo, setLockedLevelInfo] = useState<{
    level: string;
    prevLevel: string;
  } | null>(null);

  return (
    <div>
      <div className="w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-20 gap-4">
          <div className="lg:col-span-13 grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="border-red-100 bg-white overflow-hidden transition-all duration-300 rounded-md">
              <div className="flex items-center justify-between  px-8 py-6">
                <div>
                  <h2 className="text-2xl font-semibold text-red-500 mb-1">
                    Türkçe Öğrenme Yolculuğu
                  </h2>
                  <p className="text-white/80">Akıcılığa giden yolunuz</p>
                </div>
                <div className="flex items-center gap-8 text-white">
                  <div className="text-center">
                    <div className="text-xl font-semibold">2,847</div>
                    <div className="text-xs text-white/80 uppercase tracking-wide">
                      Puan
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold">1/6</div>
                    <div className="text-xs text-white/80 uppercase tracking-wide">
                      Seviye
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="relative h-[500px]  bg-opacity-10">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zM22.343 0L13.8 8.544l1.414 1.414 9.9-9.9h-2.77zm22.628 0L53.8 8.828l-1.415 1.415L41.456 0h3.515zM32.657 0L41.2 8.544l-1.414 1.414-9.9-9.9h2.77zm-6.985 0L36.143 10.515l-1.414 1.414L22.457 0h3.215zM24.17 0L36.67 12.5l-1.414 1.414L20.485 0h3.685zm16.943 0L50.8 9.485l-1.414 1.414L36.114 0h4.997zm-8.6 0L47.8 15.485l-1.414 1.414-17.9-17.9h4.656zM0 47.8l8.485 8.485-1.414 1.414L0 50.627V47.8zm0-4.657l10.485 10.485-1.414 1.414L0 45.97v-2.827zm0-4.657l12.485 12.485-1.414 1.414L0 41.314v-2.827zm0-4.657l14.485 14.485-1.414 1.414L0 36.657V33.83zm0-4.657l16.485 16.485-1.414 1.414L0 32V29.173zm0-4.657l18.485 18.485-1.414 1.414L0 27.343v-2.827zm0-4.657l20.485 20.485-1.414 1.414L0 22.686v-2.827zm0-4.657l22.485 22.485-1.414 1.414L0 18.03v-2.827zm0-4.657l24.485 24.485-1.414 1.414L0 13.372v-2.827zm0-4.657l26.485 26.485-1.414 1.414L0 8.715V5.888zm0-4.657l28.485 28.485-1.414 1.414L0 4.058V1.23z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    }}
                  />
                  {learningJourney.map((location, index) => {
                    if (index < learningJourney.length - 1) {
                      return (
                        <div key={`path-${index}`}>
                          {renderPath(location, learningJourney[index + 1])}
                        </div>
                      );
                    }
                    return null;
                  })}
                  {learningJourney.map((location) => (
                    <div
                      key={location.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-105"
                      style={{
                        left: `${location.position.x}%`,
                        top: `${location.position.y}%`,
                      }}
                      onClick={() => {
                        if (location.locked) {
                          const prevLocation =
                            learningJourney[
                              learningJourney.findIndex(
                                (l) => l.id === location.id
                              ) - 1
                            ];
                          setLockedLevelInfo({
                            level: location.level,
                            prevLevel: prevLocation.level,
                          });
                          setShowLockedModal(true);
                        } else {
                          setSelectedLocation(
                            selectedLocation === location.id
                              ? null
                              : location.id
                          );
                        }
                      }}
                    >
                      <div
                        className={`relative w-16 h-16 rounded-full border-4 border-white  flex items-center justify-center font-semibold text-white transition-all duration-300 ${
                          location.completed
                            ? "bg-red-600"
                            : location.current
                            ? "bg-red-600 ring-4 ring-red-200"
                            : location.locked
                            ? "bg-gray-400"
                            : "bg-gray-300"
                        }`}
                      >
                        {location.completed ? (
                          <CheckCircle className="w-7 h-7" />
                        ) : location.current ? (
                          <Play className="w-6 h-6" />
                        ) : location.locked ? (
                          <Lock className="w-6 h-6" />
                        ) : (
                          <MapPin className="w-6 h-6" />
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 bg-white rounded-full px-2 py-1 text-xs font-bold text-red-700 shadow-md border border-red-200">
                        {location.level}
                      </div>
                      {location.stars > 0 && (
                        <div className="absolute -top-1 -left-1 flex">
                          {[...Array(Math.min(location.stars, 3))].map(
                            (_, index) => (
                              <Star
                                key={index}
                                className="w-3 h-3 text-yellow-500 fill-current"
                              />
                            )
                          )}
                        </div>
                      )}
                      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center">
                        <div
                          className={`px-3 py-1 rounded-lg text-sm font-medium shadow-sm ${
                            location.completed
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : location.current
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-white text-gray-600 border border-gray-200"
                          }`}
                        >
                          {location.name}
                        </div>
                      </div>
                    </div>
                  ))}

                  {showLockedModal && lockedLevelInfo && (
                    <div className="fixed inset-0  flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-6 max-w-md mx-4">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                          Seviye Kilitli
                        </h3>
                        <p className="text-gray-600 mb-6">
                          {`${lockedLevelInfo.level} seviyesini açmak için ${lockedLevelInfo.prevLevel} seviyesini tamamlamalı ve en az 3 yıldız kazanmalısınız.`}
                        </p>
                        <Button
                          onClick={() => setShowLockedModal(false)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          Anladım
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedLocation &&
                    !learningJourney.find((l) => l.id === selectedLocation)
                      ?.locked && (
                      <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl shadow-xl border border-red-200 animate-in slide-in-from-bottom duration-300">
                        {(() => {
                          const location = learningJourney.find(
                            (l) => l.id === selectedLocation
                          );
                          if (!location) return null;

                          return (
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                      Seviye {location.level}
                                    </h3>
                                    <Badge
                                      className={`${
                                        location.completed
                                          ? "bg-red-100 text-red-700"
                                          : location.current
                                          ? "bg-red-600 text-white"
                                          : "bg-gray-100 text-gray-600"
                                      }`}
                                    >
                                      {location.name}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-600 mb-3">
                                    {location.description}
                                  </p>

                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Target className="w-4 h-4" />
                                      <span>
                                        {location.requiredPoints} puan
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {location.estimatedHours} saat
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <BookOpen className="w-4 h-4" />
                                      <span>{location.topics.length} konu</span>
                                    </div>
                                  </div>
                                </div>

                                {!location.locked && (
                                  <Button
                                    className={`ml-4 ${
                                      location.current
                                        ? "bg-[#58cc02] hover:bg-[#76d91c] text-white"
                                        : location.completed
                                        ? "bg-green-100 hover:bg-green-200 text-green-700"
                                        : "bg-[#58cc02] hover:bg-[#76d91c] text-white"
                                    }`}
                                  >
                                    {location.current ? (
                                      <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Devam Et
                                      </>
                                    ) : location.completed ? (
                                      <>
                                        <Trophy className="w-4 h-4 mr-2" />
                                        Gözden Geçir
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Başla
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <Brain className="w-4 h-4" />
                                  Ana Konular
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {location.topics.map((topic, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
                                    >
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          location.completed
                                            ? "bg-[#58cc02]"
                                            : location.current
                                            ? "bg-[#76d91c]"
                                            : "bg-gray-300"
                                        }`}
                                      />
                                      <span className="text-sm text-gray-600">
                                        {topic}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                </div>
              </CardContent>
            </div>
          </div>
          <div className="lg:col-span-7">
            <ProfileFriendList />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfileLevelProgression;
