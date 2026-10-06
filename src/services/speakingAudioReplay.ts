type CreateSpeakingAudioReplayUrlInput = {
  streamUrl: string;
  loadBlob: (streamUrl: string) => Promise<Blob>;
  createObjectUrl?: (blob: Blob) => string;
};

export const createSpeakingAudioReplayUrl = async ({
  streamUrl,
  loadBlob,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
}: CreateSpeakingAudioReplayUrlInput): Promise<string> => {
  const normalizedUrl = String(streamUrl || "").trim();
  if (!normalizedUrl) throw new Error("SPEAKING_AUDIO_URL_MISSING");

  const blob = await loadBlob(normalizedUrl);
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error("SPEAKING_AUDIO_BLOB_INVALID");
  }

  return createObjectUrl(blob);
};
