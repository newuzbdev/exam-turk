import axios from "axios";

const API_BASE_URL = "https://api.turkishmock.uz/api";

export const findOneSpeakingTest = async (id: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/speaking-test/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching speaking test:", error);
    throw error;
  }
};

export const submitSpeechToText = async (audioFile: File) => {
  const formData = new FormData();
  formData.append("file", audioFile);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/speaking-submission/speech-to-text`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error processing speech-to-text:", error);
    throw error;
  }
};

export const createSpeakingSubmission = async (submissionData: any) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/speaking-submission`,
      submissionData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating speaking submission:", error);
    throw error;
  }
};
