import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Camera, Check, Copy, Loader2, Pencil, Save, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toApiUrl } from "@/config/runtime";
import { authService } from "@/services/auth.service";

export type ProfileUser = {
  id: string;
  name?: string;
  username?: string;
  userName?: string;
  avatarUrl?: string;
  avatar?: string;
};

type SelectedAvatar = { file: File; url: string };

export function ProfileDetails({ user, onSaved, className }: {
  user: ProfileUser;
  onSaved: (updated: Record<string, unknown>) => void;
  className?: string;
}) {
  const nameId = useId();
  const fileId = useId();
  const formId = useId();
  const photoHintId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const savedName = user.name?.trim() || user.username?.trim() || user.userName?.trim() || "";
  const [name, setName] = useState(savedName);
  const [editing, setEditing] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const avatarUrl = selectedAvatar?.url || toApiUrl(user.avatarUrl || user.avatar);
  const nameParts = (name.trim() || savedName).split(/\s+/).filter(Boolean);
  const initials = [nameParts[0], ...(nameParts.length > 1 ? [nameParts[nameParts.length - 1]] : [])]
    .map((part) => part?.[0]?.toLocaleUpperCase("tr-TR") || "")
    .join("") || "?";
  const changed = name.trim() !== savedName || !!selectedAvatar;

  useEffect(() => {
    if (!selectedAvatar) return;
    return () => URL.revokeObjectURL(selectedAvatar.url);
  }, [selectedAvatar]);

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    setSaved(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("JPG, PNG veya WEBP biçiminde bir fotoğraf seçin.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Fotoğraf en fazla 5 MB olabilir.");
      return;
    }
    setError("");
    setSelectedAvatar({ file, url: URL.createObjectURL(file) });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !changed || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // The editable display name is independent from the unique login username.
      const updated = await authService.updateUser(
        user.id,
        { name: name.trim() },
        { avatarFile: selectedAvatar?.file },
      );
      onSaved(updated);
      setName(String(updated.name || name.trim()));
      setSelectedAvatar(null);
      setSaved(true);
      setEditing(false);
    } catch {
      setError("Profil kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  const startEditing = () => {
    setName(savedName);
    setError("");
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setName(savedName);
    setSelectedAvatar(null);
    setError("");
    setEditing(false);
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <form id={formId} onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <label htmlFor={fileId} className="sr-only">Profil fotoğrafı</label>
                <input id={fileId} ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp"
                  className="sr-only" disabled={!editing || saving}
                  onChange={(event) => { chooseAvatar(event.target.files?.[0]); event.target.value = ""; }} />
                <Avatar className="h-20 w-20 border border-gray-200">
                  <AvatarImage src={avatarUrl || undefined} alt="Profil fotoğrafı önizlemesi" className="object-cover"
                    onLoadingStatusChange={(status) => {
                      if (status === "error" && selectedAvatar) {
                        setSelectedAvatar(null);
                        setError("Bu fotoğraf açılamadı. Başka bir fotoğraf seçin.");
                      }
                    }} />
                  <AvatarFallback className="bg-gray-100 text-xl font-semibold text-gray-600">{initials}</AvatarFallback>
                </Avatar>
                {editing && <Button type="button" variant="outline" size="icon" disabled={saving}
                  className="absolute -right-1 -bottom-1 rounded-full bg-white text-gray-700 shadow-sm"
                  onClick={() => fileInput.current?.click()} aria-label={avatarUrl ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
                  aria-describedby={photoHintId} title="JPG, PNG veya WEBP · en fazla 5 MB">
                  <Camera aria-hidden="true" className="h-4 w-4" />
                </Button>}
              </div>
              <div className="min-w-0 max-w-xs flex-1">
                {editing ? <>
                  <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium text-gray-700">Görünen ad</label>
                  <Input id={nameId} value={name} required disabled={saving} autoComplete="nickname"
                    onChange={(event) => { setName(event.target.value); setSaved(false); }}
                    className="h-10" placeholder="Adınız veya takma adınız" />
                </> : <p className="break-words text-xl font-semibold text-[var(--tm-text-primary)]">{savedName || "Kullanıcı"}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              {editing ? <>
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={cancelEditing}>Vazgeç</Button>
                <Button type="submit" form={formId} size="sm" disabled={!changed || !name.trim() || saving}
                  className="bg-brand-red text-white hover:bg-brand-red-dark">
                  {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                  {saving ? "Kaydediliyor" : "Kaydet"}
                </Button>
              </> : <Button type="button" variant="outline" size="sm" onClick={startEditing}>
                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />Düzenle
              </Button>}
            </div>
          </div>
          <p id={photoHintId} className="sr-only">JPG, PNG veya WEBP · en fazla 5 MB</p>
          {editing && selectedAvatar && <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Yeni fotoğraf seçildi.</span>
            <Button type="button" variant="ghost" size="sm" disabled={saving} className="h-7 text-xs"
              onClick={() => { setSelectedAvatar(null); setError(""); }}>
              <X aria-hidden="true" className="h-3.5 w-3.5" />Seçimi iptal et
            </Button>
          </div>}
          <div className={error || saved ? "text-sm" : "sr-only"} aria-live="polite">
            {error ? <p role="alert" className="text-red-700">{error}</p> : saved ? <p className="text-gray-600">Profil kaydedildi.</p> : null}
          </div>
        </form>
        <div className="mt-5 border-t border-gray-100 pt-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
            <span className="shrink-0">Hesap no</span>
            <code className="min-w-0 truncate select-all" title={user.id}>{user.id}</code>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={copyId}
              aria-label="Hesap numarasını kopyala" title={copyStatus === "copied" ? "Kopyalandı" : "Kopyala"}>
              {copyStatus === "copied" ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className={copyStatus === "error" ? "mt-1 text-xs text-gray-500" : "sr-only"} role="status">
            {copyStatus === "error" ? "Kopyalanamadı. Numarayı seçip kopyalayabilirsiniz." : copyStatus === "copied" ? "Hesap numarası kopyalandı." : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
