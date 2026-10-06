export type AudioProfileId = "current" | "natural";

export type AudioQualityProfile = {
  title: string;
  description: string;
  constraints: MediaTrackConstraints;
  audioBitsPerSecond?: number;
};

export const AUDIO_QUALITY_PROFILES: Record<
  AudioProfileId,
  AudioQualityProfile
> = {
  current: {
    title: "Mevcut ayar",
    description: "Sınavda şu anda kullanılan otomatik ses filtreleriyle kaydeder.",
    constraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 44_100,
    },
  },
  natural: {
    title: "Doğal kayıt",
    description: "Tarayıcının ses filtrelerini kapatır ve daha yüksek kalite ister.",
    constraints: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: { ideal: 48_000 },
    },
    audioBitsPerSecond: 128_000,
  },
};
