import axiosPrivate from '@/config/api';
import { toast } from 'sonner';

export interface SpeechToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export interface SpeechToTextOptions {
  language?: string;
  prompt?: string;
  context?: string;
  timeoutMs?: number;
  retryCount?: number;
}

const DEFAULT_STT_TIMEOUT_MS = 45000;
const DEFAULT_STT_RETRY_COUNT = 1;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeMimeType = (mimeType: string): string => {
  return String(mimeType || '').split(';')[0].trim().toLowerCase();
};

const audioExtensionByMimeType: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'mp4',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
};

const getAudioFileName = (audioBlob: Blob): string => {
  const normalizedMimeType = normalizeMimeType(audioBlob.type);
  const extension = audioExtensionByMimeType[normalizedMimeType] || 'webm';
  return `recording.${extension}`;
};

const shouldRetrySpeechToText = (error: any): boolean => {
  const status = Number(error?.response?.status || 0);
  if (error?.code === 'ECONNABORTED') return true;
  if (status === 408 || status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
};

const buildSpeechErrorMessage = (error: any): string => {
  const backendMessage =
    error?.response?.data?.message || error?.response?.data?.error;
  if (backendMessage) return String(backendMessage);

  const status = Number(error?.response?.status || 0);
  if (status === 413) return 'Ses dosyasi cok buyuk';
  if (status === 415) return 'Desteklenmeyen ses formati';
  if (error?.code === 'ECONNABORTED') return 'Islem zaman asimina ugradi';
  return 'Ses metne donusturulurken hata olustu';
};

export const speechToTextService = {
  /**
   * Convert audio blob to text using the speech-to-text API
   * @param audioBlob - The audio blob to convert
   * @returns Promise with the transcribed text
   */
  convertAudioToText: async (
    audioBlob: Blob,
    options?: SpeechToTextOptions,
  ): Promise<SpeechToTextResponse> => {
    if (!audioBlob || audioBlob.size === 0) {
      const errorMessage = 'Ses kaydi bulunamadi';
      toast.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const timeoutMs = Math.max(
      10000,
      Number(options?.timeoutMs) || DEFAULT_STT_TIMEOUT_MS,
    );
    const retryCount = Math.max(
      0,
      Math.min(3, Number(options?.retryCount) || DEFAULT_STT_RETRY_COUNT),
    );

    let lastError: any = null;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const formData = new FormData();
        const fileName = getAudioFileName(audioBlob);
        formData.append('audio', audioBlob, fileName);
        formData.append('mimeType', audioBlob.type || 'application/octet-stream');
        formData.append('language', (options?.language || 'tr').trim());

        const prompt = String(options?.prompt || '').trim();
        if (prompt) formData.append('prompt', prompt);

        const context = String(options?.context || '').trim();
        if (context) formData.append('context', context);

        const response = await axiosPrivate.post(
          '/api/speaking-submission/speech-to-text',
          formData,
          { timeout: timeoutMs },
        );

        const rawText = response.data?.text ?? response.data?.transcript;
        if (response.data && rawText !== undefined) {
          return {
            success: true,
            text: String(rawText || ''),
          };
        }

        throw new Error('Speech to text response missing transcript');
      } catch (error: any) {
        lastError = error;
        const hasNextAttempt = attempt < retryCount;
        if (hasNextAttempt && shouldRetrySpeechToText(error)) {
          await wait(350 * (attempt + 1));
          continue;
        }
        break;
      }
    }

    console.error('Speech to text error:', lastError);
    const errorMessage = buildSpeechErrorMessage(lastError);
    toast.error(errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  },

  /**
   * Convert audio blob to a more compatible format if needed
   * @param audioBlob - The original audio blob
   * @returns Promise with converted audio blob
   */
  convertAudioFormat: async (audioBlob: Blob): Promise<Blob> => {
    // For now, return the original blob
    // In the future, we could implement audio format conversion here
    return audioBlob;
  },

  /**
   * Validate audio blob before sending
   * @param audioBlob - The audio blob to validate
   * @returns boolean indicating if the audio is valid
   */
  validateAudioBlob: (audioBlob: Blob): boolean => {
    // Check if blob exists and has content
    if (!audioBlob || audioBlob.size === 0) {
      toast.error('Ses kaydi bulunamadi');
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioBlob.size > maxSize) {
      toast.error('Ses dosyasi cok buyuk (maksimum 10MB)');
      return false;
    }

    // Check if it's an audio file
    if (!audioBlob.type.startsWith('audio/')) {
      toast.error('Gecersiz ses dosyasi formati');
      return false;
    }

    return true;
  }
};

export default speechToTextService;
