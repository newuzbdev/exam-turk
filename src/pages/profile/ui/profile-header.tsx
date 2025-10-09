import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Calendar, Star, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ProfileHeader = () => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; userName: string; avatarUrl: string }>({ name: "", userName: "", avatarUrl: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

    useEffect(() => {
      const fetchUserData = async () => {
        try {
          const userData = await authService.getCurrentUser();
          console.log("Profile - User data received:", userData);
          if (userData) {
            setUser({
              ...userData,
              followers: 0, // Default values for now
              following: 0,
              joinDate: userData.createdAt
                ? new Date(userData.createdAt).toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                  })
                : "Bilinmiyor",
              totalPoints: 0,
              bio: "Türkçe dil ve kültürünü öğrenmeye tutkulu.",
            });
            setForm({ name: userData.name || "", userName: userData.username || userData.userName || "", avatarUrl: userData.avatarUrl || userData.avatar || "" });
          }
        } catch (error) {
          console.error("Profile - Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }, []);

  if (loading) {
    return (
      <Card className="border-red-100 hover:border-red-200 transition-all duration-300">
        <CardContent className="p-8">
          <div className="animate-pulse">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="border-red-100 hover:border-red-200 transition-all duration-300">
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            Kullanıcı bilgileri yüklenemedi
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <div>
      <Card className="border-red-100 hover:border-red-200 transition-all duration-300">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage
                  src={user.avatarUrl || user.avatar ? 
                    (user.avatarUrl || user.avatar).startsWith('http') ? 
                      (user.avatarUrl || user.avatar) : 
                      `https://api.turkcetest.uz/${user.avatarUrl || user.avatar}` 
                    : undefined}
                  alt={user.name}
                />
                <AvatarFallback className="text-2xl font-semibold text-red-700">
                  {user.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {user.name}
                  </h1>
                  <p className="text-lg text-gray-600 mb-3">
                    {user.username
                      ? `@${user.username}`
                      : user.email || "Kullanıcı"}
                  </p>
                  <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                </div>
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-red-500 text-white hover:bg-red-600"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Profili Düzenle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Profili Düzenle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-700">Ad</label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Kullanıcı adı</label>
                        <Input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Profil Fotoğrafı</label>
                        <div className="space-y-2">
                          {avatarPreview || form.avatarUrl ? (
                            <img 
                              src={avatarPreview || (form.avatarUrl?.startsWith('http') ? form.avatarUrl : `https://api.turkcetest.uz/${form.avatarUrl}`)} 
                              alt="Önizleme" 
                              className="w-24 h-24 rounded-full object-cover border" 
                            />
                          ) : null}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setAvatarFile(file);
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setAvatarPreview(url);
                              } else {
                                setAvatarPreview("");
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={async () => {
                            if (!user?.id) return;
                            try {
                              const updated = await authService.updateUser(
                                user.id,
                                { name: form.name, userName: form.userName, avatarUrl: form.avatarUrl },
                                { avatarFile }
                              );
                              setUser({ ...user, ...updated, username: updated.userName || updated.username, avatarUrl: updated.avatarUrl || updated.avatar });
                              setEditOpen(false);
                              setAvatarFile(null);
                              setAvatarPreview("");
                            } catch {}
                          }}
                        >
                          Kaydet
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                  className={`px-6 ${
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
      </Card>
    </div>
  );
};

export default ProfileHeader;
