import { toApiUrl } from "@/config/runtime";

export type SiteAudioKey =
  | "audio/speaking-1-1"
  | "audio/speaking-1-2"
  | "audio/speaking-2"
  | "audio/speaking-3"
  | "audio/start"
  | "audio/listening-sound-check-tr-v1"
  | "audio/bell";

let cachedAudio: Record<string, string> | null = null;
let expiresAt = 0;
let pendingRequest: Promise<Record<string, string>> | null = null;

async function requestSiteAudio(): Promise<Record<string, string>> {
  const response = await fetch(toApiUrl("/api/file/public/site-audio"), {
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    throw new Error("Site sesi bağlantısı alınamadı.");
  }
  return (await response.json()) as Record<string, string>;
}

export async function getSiteAudioUrls(): Promise<Record<string, string>> {
  if (cachedAudio && Date.now() < expiresAt) return cachedAudio;
  if (!pendingRequest) {
    pendingRequest = requestSiteAudio()
      .then((audio) => {
        cachedAudio = audio;
        expiresAt = Date.now() + 45 * 60 * 1000;
        return audio;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
}

export async function getSiteAudioUrl(key: SiteAudioKey): Promise<string> {
  let url = (await getSiteAudioUrls())[key];
  if (!url) {
    // A newly deployed sample may not exist in an earlier cached catalog.
    cachedAudio = null;
    expiresAt = 0;
    url = (await getSiteAudioUrls())[key];
  }
  if (!url) throw new Error("Site sesi bulunamadı.");
  return url;
}
