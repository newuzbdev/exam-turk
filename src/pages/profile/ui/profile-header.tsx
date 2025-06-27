// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";

// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { UserPlus, Calendar, Star, Pencil } from "lucide-react";
// import { useState } from "react";
// const user = {
//   name: "Ahmet Yılmaz",
//   username: "@ahmetyilmaz",
//   avatar: "https://i.pravatar.cc/300",
//   followers: 234,
//   following: 189,
//   joinDate: "Mart 2023",
//   totalPoints: 2847,
//   bio: "Türkçe dil ve kültürünü öğrenmeye tutkulu. Şu anda B1 sertifikası için hazırlanıyorum.",
// };
// const ProfileHeader = () => {
//   const [isFollowing, setIsFollowing] = useState(false);
//   return (
//     <div>
//       <Card className="border-red-100 hover:border-red-200 transition-all duration-300">
//         <CardContent className="p-8">
//           <div className="flex flex-col md:flex-row gap-8">
//             <div className="flex flex-col items-center md:items-start">
//               <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
//                 <AvatarImage src={user.avatar} alt={user.name} />
//                 <AvatarFallback className="text-2xl font-semibold text-red-700">
//                   {user.name
//                     .split(" ")
//                     .map((n) => n[0])
//                     .join("")}
//                 </AvatarFallback>
//               </Avatar>
//             </div>

//             <div className="flex-1 space-y-4">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <h1 className="text-3xl font-bold text-gray-900 mb-1">
//                     {user.name}
//                   </h1>
//                   <p className="text-lg text-gray-600 mb-3">{user.username}</p>
//                   <p className="text-gray-700 leading-relaxed">{user.bio}</p>
//                 </div>
//                 <Button variant="outline" className=" bg-red-500 text-white">
//                   <Pencil className="w-4 h-4 mr-2" />
//                   Profili Düzenle
//                 </Button>
//               </div>

//               <div className="flex flex-wrap gap-6 text-sm">
//                 <div className="flex items-center gap-1">
//                   <Calendar className="w-4 h-4 text-gray-500" />
//                   <span className="text-gray-600">
//                     {user.joinDate} tarihinde katıldı
//                   </span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <Star className="w-4 h-4 text-red-500" />
//                   <span className="font-medium text-gray-900">
//                     {user.totalPoints.toLocaleString()} puan
//                   </span>
//                 </div>
//               </div>

//               <div className="flex items-center gap-6 text-sm">
//                 <div>
//                   <span className="font-semibold text-gray-900">
//                     {user.followers}
//                   </span>
//                   <span className="text-gray-600 ml-1">takipçi</span>
//                 </div>
//                 <div>
//                   <span className="font-semibold text-gray-900">
//                     {user.following}
//                   </span>
//                   <span className="text-gray-600 ml-1">takip edilen</span>
//                 </div>
//               </div>

//               <div className="flex gap-3 pt-2">
//                 <Button
//                   onClick={() => setIsFollowing(!isFollowing)}
//                   className={`px-6 ${
//                     isFollowing
//                       ? "bg-white border border-red-200 text-red-600 hover:bg-red-50"
//                       : "bg-red-600 hover:bg-red-700 text-white"
//                   }`}
//                 >
//                   <UserPlus className="w-4 h-4 mr-2" />
//                   {isFollowing ? "Takip Ediliyor" : "Takip Et"}
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default ProfileHeader;
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Calendar, Star, Pencil } from "lucide-react";
import { useState } from "react";
const user = {
  name: "Ahmet Yılmaz",
  username: "@ahmetyilmaz",
  avatar: "https://i.pravatar.cc/300",
  followers: 234,
  following: 189,
  joinDate: "Mart 2023",
  totalPoints: 2847,
  bio: "Türkçe dil ve kültürünü öğrenmeye tutkulu. Şu anda B1 sertifikası için hazırlanıyorum.",
};
const ProfileHeader = () => {
  const [isFollowing, setIsFollowing] = useState(false);
  return (
    <div>
      {/* <Card className="border-red-100 hover:border-red-200 transition-all duration-300"> */}
      <CardContent className="py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center md:items-start relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl font-semibold text-red-700">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <Button className="absolute top-0 right-0 p-2 bg-white rounded-full">
              <Pencil className="w-4 h-4 text-red-600" />
            </Button>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {user.name}
                </h1>
                <p className="text-lg text-gray-600 mb-3">{user.username}</p>
                <p className="text-gray-700 leading-relaxed">{user.bio}</p>
              </div>
              <Button
                variant="outline"
                className=" bg-red-500 text-white rounded-lg"
              >
                <Pencil className="w-4 h-4 " />
                Profili Düzenle
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  {user.joinDate} tarihinde katıldı
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-red-500" />
                <span className="font-medium text-gray-900">
                  {user.totalPoints.toLocaleString()} puan
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="font-semibold text-gray-900">
                  {user.followers}
                </span>
                <span className="text-gray-600 ml-1">takipçi</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  {user.following}
                </span>
                <span className="text-gray-600 ml-1">takip edilen</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setIsFollowing(!isFollowing)}
                className={` ${
                  isFollowing
                    ? "bg-white border border-red-200 text-red-600 hover:bg-red-50"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isFollowing ? "Takip Ediliyor" : "Takip Et"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <div className="h-0.5 bg-gray-200 w-full mt-4"></div>
    </div>
  );
};

export default ProfileHeader;
