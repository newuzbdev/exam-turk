export const PUBLIC_RESULT_SHARING_VERSION = "public-result-sharing-2026-10-10";

export type PublicResultSharingConsent = {
  publicResultSharing?: boolean;
  publicResultSharingGrantedAt?: string | null;
  publicResultSharingVersion?: string | null;
};

export function hasPublicResultSharingConsent(user: PublicResultSharingConsent | null | undefined) {
  return user?.publicResultSharing === true && Boolean(user.publicResultSharingGrantedAt) &&
    user.publicResultSharingVersion === PUBLIC_RESULT_SHARING_VERSION;
}

export const PUBLIC_RESULT_SHARING_LABEL = "Sonuçlarımın herkese açık listede paylaşılmasına izin veriyorum.";
export const PUBLIC_RESULT_SHARING_DESCRIPTION = "Profil adınız, varsa fotoğrafınız, test türünüz, puanınız ve test tarihiniz ziyaretçilere gösterilebilir. Ses kayıtlarınız ve cevaplarınız bu listede paylaşılmaz. Bu seçim isteğe bağlıdır; Profil sayfasından değiştirebilirsiniz.";
