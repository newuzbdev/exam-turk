import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ProfileHeader = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; userName: string; avatarUrl: string }>({ name: "", userName: "", avatarUrl: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const getAvatarUrl = () => {
    if (!user) return null;
    const avatar = user.avatarUrl || user.avatar;
    if (!avatar) return null;
    return avatar.startsWith('http') ? avatar : `https://api.turkishmock.uz/${avatar}`;
  };

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
      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
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
      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Kullanıcı bilgileri yüklenemedi
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setImagePreviewOpen(true)}
            >
              <Avatar className="w-16 h-16">
                <AvatarImage
                  src={getAvatarUrl() || undefined}
                  alt={user.name}
                />
                <AvatarFallback className="text-lg font-semibold text-gray-700 bg-gray-100">
                  {user.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {user.name}
              </h1>
              <p className="text-base text-gray-600">
                {user.email || user.username || "Kullanıcı"}
              </p>
            </div>
          </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                onClick={() => setEditOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Ayarlar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Profili Düzenle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Ad</label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Kullanıcı adı</label>
                  <Input 
                    value={form.userName} 
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Profil Fotoğrafı</label>
                  <div className="space-y-3">
                    {avatarPreview || form.avatarUrl ? (
                      <div className="flex justify-center">
                        <img 
                          src={avatarPreview || (form.avatarUrl?.startsWith('http') ? form.avatarUrl : `https://api.turkishmock.uz/${form.avatarUrl}`)} 
                          alt="Önizleme" 
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm" 
                        />
                      </div>
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
                      className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditOpen(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white px-6"
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
      </CardContent>

      {/* Image Preview Modal - Telegram Style */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-black/95 border-none sm:rounded-lg">
          <div className="relative w-full flex items-center justify-center min-h-[70vh] p-4 sm:p-8">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl() || undefined}
                alt={user.name}
                className="max-w-full max-h-[80vh] w-auto h-auto rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-2xl">
                <span className="text-6xl sm:text-8xl font-semibold text-white">
                  {user.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </span>
              </div>
            )}
            <button
              onClick={() => setImagePreviewOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/20 z-10"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProfileHeader;
