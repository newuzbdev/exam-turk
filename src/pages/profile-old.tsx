// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress";
// import { Badge } from "@/components/ui/badge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Users,
//   UserPlus,
//   MessageCircle,
//   Trophy,
//   BookOpen,
//   Brain,
//   Target,
//   Calendar,
//   TrendingUp,
//   Award,
//   Star,
//   Flame,
//   ChevronRight,
//   Share2,
// } from "lucide-react";

// export default function Profile() {
//   const [animatedProgress, setAnimatedProgress] = useState({
//     vocab: 0,
//     grammar: 0,
//   });
//   const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
//   const [streakCount, setStreakCount] = useState(0);

//   // Mock data for the profile
//   const user = {
//     name: "Ahmet Yılmaz",
//     username: "@ahmetyilmaz",
//     avatar: "/placeholder.svg?height=120&width=120",
//     followers: 234,
//     following: 189,
//     isFollowing: false,
//     joinDate: "March 2023",
//     streak: 15,
//     totalPoints: 2847,
//   };

//   const languageProgress = {
//     vocabulary: {
//       currentLevel: "A2",
//       progress: 75,
//       nextLevel: "B1",
//     },
//     grammar: {
//       currentLevel: "A2",
//       progress: 60,
//       nextLevel: "B1",
//     },
//   };

//   const levels = [
//     { name: "A1", description: "Beginner", points: 500 },
//     { name: "A2", description: "Elementary", points: 1000 },
//     { name: "B1", description: "Intermediate", points: 2000 },
//     { name: "B2", description: "Upper-Intermediate", points: 3500 },
//     { name: "C1", description: "Advanced", points: 5000 },
//     { name: "C2", description: "Proficient", points: 7000 },
//   ];

//   const lastTestResults = [
//     {
//       type: "Vocabulary Test",
//       score: 85,
//       level: "A2",
//       date: "2 days ago",
//       questions: 50,
//       improvement: "+5%",
//       icon: BookOpen,
//     },
//     {
//       type: "Grammar Test",
//       score: 78,
//       level: "A2",
//       date: "5 days ago",
//       questions: 40,
//       improvement: "+12%",
//       icon: Brain,
//     },
//     {
//       type: "Mock Exam",
//       score: 82,
//       level: "A2",
//       date: "1 week ago",
//       questions: 100,
//       improvement: "+8%",
//       icon: Trophy,
//     },
//   ];

//   const friends = [
//     {
//       name: "Elif Kaya",
//       avatar: "/placeholder.svg?height=40&width=40",
//       level: "B1",
//       online: true,
//       streak: 12,
//     },
//     {
//       name: "Mehmet Öz",
//       avatar: "/placeholder.svg?height=40&width=40",
//       level: "A2",
//       online: false,
//       streak: 8,
//     },
//     {
//       name: "Zeynep Ak",
//       avatar: "/placeholder.svg?height=40&width=40",
//       level: "B2",
//       online: true,
//       streak: 25,
//     },
//     {
//       name: "Can Demir",
//       avatar: "/placeholder.svg?height=40&width=40",
//       level: "A2",
//       online: true,
//       streak: 5,
//     },
//     {
//       name: "Ayşe Yıldız",
//       avatar: "/placeholder.svg?height=40&width=40",
//       level: "B1",
//       online: false,
//       streak: 18,
//     },
//     {
//       name: "Burak Şen",
//       avatar: "/placeholder.svg?height=40&width=40",
//       level: "A1",
//       online: true,
//       streak: 3,
//     },
//   ];

//   const achievements = [
//     { name: "First Steps", icon: Star, unlocked: true },
//     { name: "Week Warrior", icon: Flame, unlocked: true },
//     { name: "Grammar Master", icon: Brain, unlocked: false },
//     { name: "Vocab Champion", icon: BookOpen, unlocked: true },
//   ];

//   // Animate progress bars on mount
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setAnimatedProgress({
//         vocab: languageProgress.vocabulary.progress,
//         grammar: languageProgress.grammar.progress,
//       });
//     }, 500);

//     // Animate streak counter
//     let count = 0;
//     const streakTimer = setInterval(() => {
//       if (count < user.streak) {
//         count++;
//         setStreakCount(count);
//       } else {
//         clearInterval(streakTimer);
//       }
//     }, 50);

//     return () => {
//       clearTimeout(timer);
//       clearInterval(streakTimer);
//     };
//   }, []);

//   const getLevelColor = (level: string) => {
//     const colors = {
//       A1: "from-red-400 to-red-600",
//       A2: "from-orange-400 to-orange-600",
//       B1: "from-yellow-400 to-yellow-600",
//       B2: "from-green-400 to-green-600",
//       C1: "from-blue-400 to-blue-600",
//       C2: "from-purple-400 to-purple-600",
//     };
//     return colors[level as keyof typeof colors] || "from-gray-400 to-gray-600";
//   };

//   const isLevelUnlocked = (level: string, currentLevel: string) => {
//     const levelIndex = levels.findIndex((l) => l.name === level);
//     const currentIndex = levels.findIndex((l) => l.name === currentLevel);
//     return levelIndex <= currentIndex;
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
//       <div className=" mx-auto space-y-6">
//         {/* Profile Header */}
//         <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
//           <CardContent className="p-8">
//             <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
//               <div className="relative">
//                 <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
//                   <AvatarImage
//                     src={user.avatar || "/placeholder.svg"}
//                     alt={user.name}
//                   />
//                   <AvatarFallback className="text-3xl bg-white/10">
//                     {user.name
//                       .split(" ")
//                       .map((n) => n[0])
//                       .join("")}
//                   </AvatarFallback>
//                 </Avatar>
//                 <div className="absolute -bottom-2 -right-2 bg-orange-500 rounded-full p-2 shadow-lg">
//                   <Flame className="w-4 h-4 text-white" />
//                 </div>
//               </div>

//               <div className="flex-1 text-center lg:text-left">
//                 <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
//                 <p className="text-blue-100 mb-1 text-lg">{user.username}</p>
//                 <p className="text-blue-200 mb-6">
//                   Learning Turkish since {user.joinDate}
//                 </p>

//                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//                   <div className="text-center">
//                     <div className="text-3xl font-bold">{user.followers}</div>
//                     <div className="text-blue-200">Followers</div>
//                   </div>
//                   <div className="text-center">
//                     <div className="text-3xl font-bold">{user.following}</div>
//                     <div className="text-blue-200">Following</div>
//                   </div>
//                   <div className="text-center">
//                     <div className="text-3xl font-bold flex items-center justify-center gap-1">
//                       <Flame className="w-6 h-6 text-orange-400" />
//                       {streakCount}
//                     </div>
//                     <div className="text-blue-200">Day Streak</div>
//                   </div>
//                   <div className="text-center">
//                     <div className="text-3xl font-bold flex items-center justify-center gap-1">
//                       <Star className="w-6 h-6 text-yellow-400" />
//                       {user.totalPoints.toLocaleString()}
//                     </div>
//                     <div className="text-blue-200">Points</div>
//                   </div>
//                 </div>

//                 <div className="flex flex-wrap justify-center lg:justify-start gap-3">
//                   <Button
//                     variant={user.isFollowing ? "secondary" : "default"}
//                     className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all duration-200 hover:scale-105"
//                   >
//                     <UserPlus className="w-4 h-4 mr-2" />
//                     {user.isFollowing ? "Following" : "Follow"}
//                   </Button>
//                   <Button
//                     variant="secondary"
//                     className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-200"
//                   >
//                     <MessageCircle className="w-4 h-4 mr-2" />
//                     Message
//                   </Button>
//                   <Button
//                     variant="secondary"
//                     className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-200"
//                   >
//                     <Share2 className="w-4 h-4 mr-2" />
//                     Share
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Quick Stats */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//           {achievements.map((achievement, index) => (
//             <Card
//               key={index}
//               className={`border-0 shadow-lg transition-all duration-200 hover:scale-105 ${
//                 achievement.unlocked
//                   ? "bg-gradient-to-br from-yellow-50 to-orange-50"
//                   : "bg-gray-50"
//               }`}
//             >
//               <CardContent className="p-4 text-center">
//                 <achievement.icon
//                   className={`w-8 h-8 mx-auto mb-2 ${
//                     achievement.unlocked ? "text-yellow-600" : "text-gray-400"
//                   }`}
//                 />
//                 <p
//                   className={`font-medium text-sm ${
//                     achievement.unlocked ? "text-gray-900" : "text-gray-500"
//                   }`}
//                 >
//                   {achievement.name}
//                 </p>
//               </CardContent>
//             </Card>
//           ))}
//         </div>

//         {/* Language Progress */}
//         <Card className="border-0 shadow-xl overflow-hidden">
//           <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
//             <CardTitle className="flex items-center gap-2 text-xl">
//               <TrendingUp className="w-6 h-6" />
//               Turkish Language Progress
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-8 space-y-8">
//             {/* Current Levels */}
//             <div className="grid lg:grid-cols-2 gap-8">
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 bg-blue-100 rounded-lg">
//                       <BookOpen className="w-5 h-5 text-blue-600" />
//                     </div>
//                     <div>
//                       <span className="font-semibold text-lg">Vocabulary</span>
//                       <p className="text-sm text-gray-500">
//                         Building your word power
//                       </p>
//                     </div>
//                   </div>
//                   <Badge
//                     className={`bg-gradient-to-r ${getLevelColor(
//                       languageProgress.vocabulary.currentLevel
//                     )} text-white px-3 py-1 text-sm font-bold shadow-lg`}
//                   >
//                     {languageProgress.vocabulary.currentLevel}
//                   </Badge>
//                 </div>
//                 <div className="space-y-2">
//                   <Progress
//                     value={animatedProgress.vocab}
//                     className="h-3 bg-gray-200"
//                   />
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">
//                       {animatedProgress.vocab}% to{" "}
//                       {languageProgress.vocabulary.nextLevel}
//                     </span>
//                     <span className="font-medium text-blue-600">
//                       {Math.round(animatedProgress.vocab * 10)} / 1000 XP
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 bg-purple-100 rounded-lg">
//                       <Brain className="w-5 h-5 text-purple-600" />
//                     </div>
//                     <div>
//                       <span className="font-semibold text-lg">Grammar</span>
//                       <p className="text-sm text-gray-500">
//                         Mastering the rules
//                       </p>
//                     </div>
//                   </div>
//                   <Badge
//                     className={`bg-gradient-to-r ${getLevelColor(
//                       languageProgress.grammar.currentLevel
//                     )} text-white px-3 py-1 text-sm font-bold shadow-lg`}
//                   >
//                     {languageProgress.grammar.currentLevel}
//                   </Badge>
//                 </div>
//                 <div className="space-y-2">
//                   <Progress
//                     value={animatedProgress.grammar}
//                     className="h-3 bg-gray-200"
//                   />
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">
//                       {animatedProgress.grammar}% to{" "}
//                       {languageProgress.grammar.nextLevel}
//                     </span>
//                     <span className="font-medium text-purple-600">
//                       {Math.round(animatedProgress.grammar * 10)} / 1000 XP
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Level Progression */}
//             <div className="space-y-6">
//               <h3 className="font-semibold text-xl flex items-center gap-2">
//                 <Target className="w-5 h-5" />
//                 Level Journey
//               </h3>
//               <div className="relative">
//                 <div className="flex items-center justify-between overflow-x-auto pb-4">
//                   {levels.map((level, index) => {
//                     const isUnlocked = isLevelUnlocked(
//                       level.name,
//                       languageProgress.vocabulary.currentLevel
//                     );
//                     const isCurrent =
//                       level.name === languageProgress.vocabulary.currentLevel;
//                     const isSelected = selectedLevel === level.name;

//                     return (
//                       <div
//                         key={level.name}
//                         className="flex flex-col items-center gap-2 min-w-0 flex-1"
//                       >
//                         <div
//                           className={`
//                             relative w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer
//                             transition-all duration-300 hover:scale-110
//                             ${
//                               isCurrent
//                                 ? `bg-gradient-to-br ${getLevelColor(
//                                     level.name
//                                   )} text-white ring-4 ring-blue-200 shadow-xl`
//                                 : isUnlocked
//                                 ? `bg-gradient-to-br ${getLevelColor(
//                                     level.name
//                                   )} text-white shadow-lg hover:shadow-xl`
//                                 : "bg-gray-200 text-gray-400 hover:bg-gray-300"
//                             }
//                             ${
//                               isSelected ? "scale-110 ring-4 ring-blue-300" : ""
//                             }
//                           `}
//                           onClick={() =>
//                             setSelectedLevel(isSelected ? null : level.name)
//                           }
//                         >
//                           {level.name}
//                           {isCurrent && (
//                             <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
//                               <Star className="w-3 h-3 text-white" />
//                             </div>
//                           )}
//                         </div>
//                         <div className="text-center">
//                           <p className="text-xs font-medium">
//                             {level.description}
//                           </p>
//                           <p className="text-xs text-gray-500">
//                             {level.points} pts
//                           </p>
//                         </div>
//                         {index < levels.length - 1 && (
//                           <div
//                             className={`absolute top-8 left-1/2 w-full h-1 -translate-x-1/2 ${
//                               isUnlocked
//                                 ? "bg-gradient-to-r from-green-400 to-blue-400"
//                                 : "bg-gray-200"
//                             }`}
//                             style={{ zIndex: -1 }}
//                           />
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Tabs for Test Results and Friends */}
//         <Tabs defaultValue="tests" className="w-full">
//           <TabsList className="grid w-full grid-cols-2 bg-white shadow-lg border-0 p-1">
//             <TabsTrigger
//               value="tests"
//               className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200"
//             >
//               <Trophy className="w-4 h-4" />
//               Recent Tests
//             </TabsTrigger>
//             <TabsTrigger
//               value="friends"
//               className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200"
//             >
//               <Users className="w-4 h-4" />
//               Friends ({friends.length})
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="tests" className="space-y-4 mt-6">
//             <Card className="border-0 shadow-xl">
//               <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
//                 <CardTitle className="flex items-center gap-2">
//                   <Award className="w-5 h-5" />
//                   Test Performance
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="p-6">
//                 <div className="space-y-4">
//                   {lastTestResults.map((test, index) => (
//                     <div
//                       key={index}
//                       className="group p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 hover:border-blue-300 bg-gradient-to-r from-white to-gray-50"
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-4">
//                           <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
//                             <test.icon className="w-6 h-6 text-blue-600" />
//                           </div>
//                           <div className="space-y-1">
//                             <h4 className="font-semibold text-lg">
//                               {test.type}
//                             </h4>
//                             <div className="flex items-center gap-4 text-sm text-gray-600">
//                               <div className="flex items-center gap-1">
//                                 <Calendar className="w-3 h-3" />
//                                 {test.date}
//                               </div>
//                               <span>•</span>
//                               <span>{test.questions} questions</span>
//                             </div>
//                           </div>
//                         </div>
//                         <div className="text-right space-y-2">
//                           <div className="flex items-center gap-2">
//                             <div className="text-3xl font-bold text-green-600">
//                               {test.score}%
//                             </div>
//                             <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
//                               {test.improvement}
//                             </div>
//                           </div>
//                           <Badge
//                             className={`bg-gradient-to-r ${getLevelColor(
//                               test.level
//                             )} text-white shadow-lg`}
//                           >
//                             {test.level}
//                           </Badge>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="friends" className="space-y-4 mt-6">
//             <Card className="border-0 shadow-xl">
//               <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
//                 <CardTitle>Study Buddies</CardTitle>
//               </CardHeader>
//               <CardContent className="p-6">
//                 <div className="grid gap-4">
//                   {friends.map((friend, index) => (
//                     <div
//                       key={index}
//                       className="group p-4 border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 hover:border-green-300 bg-gradient-to-r from-white to-gray-50"
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-4">
//                           <div className="relative">
//                             <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
//                               <AvatarImage
//                                 src={friend.avatar || "/placeholder.svg"}
//                                 alt={friend.name}
//                               />
//                               <AvatarFallback>
//                                 {friend.name
//                                   .split(" ")
//                                   .map((n) => n[0])
//                                   .join("")}
//                               </AvatarFallback>
//                             </Avatar>
//                             {friend.online && (
//                               <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
//                             )}
//                           </div>
//                           <div className="space-y-1">
//                             <h4 className="font-semibold">{friend.name}</h4>
//                             <div className="flex items-center gap-2">
//                               <Badge
//                                 className={`bg-gradient-to-r ${getLevelColor(
//                                   friend.level
//                                 )} text-white text-xs shadow-lg`}
//                               >
//                                 {friend.level}
//                               </Badge>
//                               <div className="flex items-center gap-1 text-xs text-orange-600">
//                                 <Flame className="w-3 h-3" />
//                                 {friend.streak} day streak
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
//                           >
//                             <MessageCircle className="w-4 h-4" />
//                           </Button>
//                           <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// }
