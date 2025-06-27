import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { TabsContent } from "@radix-ui/react-tabs";
import { Flame, Users, UserPlus, Eye } from "lucide-react";

const studyFriends = [
  {
    name: "Elif Kaya",
    avatar: "/placeholder.svg?height=40&width=40",
    level: "B1",
    status: "online",
    streak: 12,
  },
  {
    name: "Mehmet Öz",
    avatar: "/placeholder.svg?height=40&width=40",
    level: "A2",
    status: "offline",
    streak: 8,
  },
  {
    name: "Zeynep Ak",
    avatar: "/placeholder.svg?height=40&width=40",
    level: "B2",
    status: "online",
    streak: 25,
  },
  {
    name: "Can Demir",
    avatar: "/placeholder.svg?height=40&width=40",
    level: "A2",
    status: "online",
    streak: 5,
  },
  {
    name: "Ayşe Yılmaz",
    avatar: "/placeholder.svg?height=40&width=40",
    level: "B1",
    status: "online",
    streak: 15,
  },
];

const ProfileFriendList = () => {
  return (
    <div className="w-full h-fit">
      <Card
        className="border-red-100 hover:border-red-200 transition-all duration-300 mx-4"
        title="Friends"
      >
        <CardContent className="p-4">
          <Tabs defaultValue="following" className="w-full">
            <TabsList className="w-full flex border-b border-gray-200 mb-4">
              <TabsTrigger
                value="following"
                className="flex-1 pb-2 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-gray-600 hover:text-red-600 transition-colors text-base md:text-lg"
              >
                Takip Edilenler
              </TabsTrigger>
              <TabsTrigger
                value="followers"
                className="flex-1 pb-2 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-gray-600 hover:text-red-600 transition-colors text-base md:text-lg"
              >
                Takipçiler
              </TabsTrigger>
            </TabsList>

            <TabsContent value="following">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <span className="text-base md:text-lg">Takip Edilenler</span>
                </div>
                <Badge variant="secondary" className="text-sm md:text-base">
                  {studyFriends.length}
                </Badge>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {studyFriends.map((friend, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-red-100 rounded-lg hover:shadow-sm transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={friend.avatar || "/placeholder.svg"}
                            alt={friend.name}
                            className="rounded-full"
                          />
                          <AvatarFallback className="bg-red-50 text-red-700 text-xs w-8 h-8 rounded-full flex items-center justify-center">
                            {friend.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${
                            friend.status === "online"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 text-base md:text-lg truncate group-hover:text-red-700 transition-colors">
                          {friend.name}
                        </h4>

                        <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
                          <Badge className="bg-red-100 text-red-800 border border-red-200 text-sm md:text-base px-1 py-0">
                            {friend.level}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-red-500" />
                            <span>{friend.streak}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Eye size={24} className="cursor-pointer text-red-500" />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="followers">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <span className="text-base md:text-lg">Takipçiler</span>
                </div>
                <Badge variant="secondary" className="text-sm md:text-base">
                  {studyFriends.length}
                </Badge>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {studyFriends.map((friend, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-red-100 rounded-lg hover:shadow-sm transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={friend.avatar || "/placeholder.svg"}
                            alt={friend.name}
                            className="rounded-full"
                          />
                          <AvatarFallback className="bg-red-50 text-red-700 text-xs w-8 h-8 rounded-full flex items-center justify-center">
                            {friend.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${
                            friend.status === "online"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 text-base md:text-lg truncate group-hover:text-red-700 transition-colors">
                          {friend.name}
                        </h4>

                        <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
                          <Badge className="bg-red-100 text-red-800 border border-red-200 text-sm md:text-base px-1 py-0">
                            {friend.level}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-red-500" />
                            <span>{friend.streak}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
export default ProfileFriendList;
