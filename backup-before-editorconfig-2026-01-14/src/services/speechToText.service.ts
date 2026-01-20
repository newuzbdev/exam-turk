import axiosPrivate from '@/config/api';
import { toast } from 'sonner';

export interface SpeechToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export const speechToTextService = {
  /**
   * Convert audio blob to text using the speech-to-text API
   * @param audioBlob - The audio blob to convert
   * @returns Promise with the transcribed text
   */
  convertAudioToText: async (audioBlob: Blob): Promise<SpeechToTextResponse> => {
    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      
      // Convert webm to a more compatible format if needed
      // For now, we'll send the webm directly
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await axiosPrivate.post('/api/speaking-submission/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for speech processing
      });

      // Backend may return either `text` or `transcript`
      const rawText = response.data?.text ?? response.data?.transcript;

      if (response.data && rawText !== undefined) {
        return {
          success: true,
          text: rawText || '' // Return empty string if text is null/undefined
        };
      } else {
        return {
          success: false,
          error: 'Ses metne dönüştürülemedi'
        };
      }
    } catch (error: any) {
      console.error('Speech to text error:', error);
      
      let errorMessage = 'Ses metne dönüştürülürken hata oluştu';
      
      if (error.response?.status === 413) {
        errorMessage = 'Ses dosyası çok büyük';
      } else if (error.response?.status === 415) {
        errorMessage = 'Desteklenmeyen ses formatı';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'İşlem zaman aşımına uğradı';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
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
      toast.error('Ses kaydı bulunamadı');
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioBlob.size > maxSize) {
      toast.error('Ses dosyası çok büyük (maksimum 10MB)');
      return false;
    }

    // Check if it's an audio file
    if (!audioBlob.type.startsWith('audio/')) {
      toast.error('Geçersiz ses dosyası formatı');
      return false;
    }

    return true;
  }
};

export default speechToTextService;
