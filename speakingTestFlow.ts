import {
  findOneSpeakingTest,
  submitSpeechToText,
  createSpeakingSubmission,
} from "./speakingTestService";

export const startSpeakingTestFlow = async (
  testId: string,
  audioFile: File,
  userAnswers: any
) => {
  try {
    // Step 1: Fetch the speaking test
    const speakingTest = await findOneSpeakingTest(testId);
    console.log("Fetched Speaking Test:", speakingTest);

    // Step 2: Process speech-to-text for the user's audio
    const speechToTextResult = await submitSpeechToText(audioFile);
    console.log("Speech-to-Text Result:", speechToTextResult);

    // Step 3: Submit the user's answers
    const submissionData = {
      speakingTestId: testId,
      parts: userAnswers,
    };
    const submissionResult = await createSpeakingSubmission(submissionData);
    console.log("Submission Result:", submissionResult);

    return submissionResult;
  } catch (error) {
    console.error("Error in speaking test flow:", error);
    throw error;
  }
};
