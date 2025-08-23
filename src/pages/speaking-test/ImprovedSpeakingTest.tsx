// import { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { Mic, Square, ArrowLeft, CheckCircle, Info, Clock } from "lucide-react";
// import axiosPrivate from "@/config/api";
// import { toast } from "sonner";
// import { MicrophoneCheck } from "./components/MicrophoneCheck";

// interface Question {
//   id: string;
//   questionText: string;
//   order: number;
//   subPartId?: string;
//   sectionId?: string;
// }

// interface SubPart {
//   id: string;
//   label: string;
//   description: string;
//   images: string[];
//   questions: Question[];
// }

// interface Section {
//   id: string;
//   title: string;
//   description: string;
//   type: string;
//   order: number;
//   subParts: SubPart[];
//   questions: Question[];
// }

// interface SpeakingTestData {
//   id: string;
//   title: string;
//   sections: Section[];
// }

// interface Recording {
//   blob: Blob;
//   duration: number;
//   questionId: string;
// }

// const sectionAudios: Record<number, string> = {
//   1: "/speakingpart1.mp3",
//   2: "/speakingpart2.mp3",
//   3: "/speakingpart3.mp3",
// };

// const ImprovedSpeakingTest = () => {
//   const { testId } = useParams();
//   const navigate = useNavigate();

//   // State
//   const [testData, setTestData] = useState<SpeakingTestData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
//   const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [showSectionDescription, setShowSectionDescription] = useState(true);
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordings, setRecordings] = useState<Map<string, Recording>>(
//     new Map()
//   );
//   const [micChecked, setMicChecked] = useState(false);
//   const [timeLeft, setTimeLeft] = useState(30);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [isTestComplete, setIsTestComplete] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isPlayingInstructions, setIsPlayingInstructions] = useState(false);
//   // const [autoRecordingEnabled, setAutoRecordingEnabled] = useState(false);

//   // Refs
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chunksRef = useRef<Blob[]>([]);
//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const startSoundRef = useRef<HTMLAudioElement | null>(null);
//   const endSoundRef = useRef<HTMLAudioElement | null>(null);

//   // Load test data and initialize audio
//   useEffect(() => {
//     if (testId) {
//       fetchTestData();
//     }

//     // Initialize sound effects
//     startSoundRef.current = new Audio(
//       "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V"
//     );
//     endSoundRef.current = new Audio(
//       "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V"
//     );
//   }, [testId]);

//   const fetchTestData = async () => {
//     try {
//       const response = await axiosPrivate.get(`/api/speaking-test/${testId}`);
//       setTestData(response.data);
//     } catch (error) {
//       console.error("Error fetching test data:", error);
//       toast.error("Test verisi yüklenemedi");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const playInstructionAudio = async (partNumber: number) => {
//   //   try {
//   //     setIsPlayingInstructions(true);
//   //     const audioFile = `/speaking part${partNumber}.mp3`;
//   //     audioRef.current = new Audio(audioFile);

//   //     audioRef.current.onended = () => {
//   //       setIsPlayingInstructions(false);
//   //       // Auto start recording after instruction
//   //       setTimeout(() => {
//   //         if (!isRecording) {
//   //           startRecording();
//   //         }
//   //       }, 1000);
//   //     };

//   //     audioRef.current.onerror = () => {
//   //       setIsPlayingInstructions(false);
//   //       toast.error("Ses talimatı oynatılamadı");
//   //     };

//   //     await audioRef.current.play();
//   //   } catch (error) {
//   //     setIsPlayingInstructions(false);
//   //     console.error("Error playing instruction audio:", error);
//   //   }
//   // };

//   const playSound = (type: "start" | "end") => {
//     try {
//       if (type === "start" && startSoundRef.current) {
//         startSoundRef.current.currentTime = 0;
//         startSoundRef.current.play().catch(console.error);
//       } else if (type === "end" && endSoundRef.current) {
//         endSoundRef.current.currentTime = 0;
//         endSoundRef.current.play().catch(console.error);
//       }
//     } catch (error) {
//       console.error("Error playing sound:", error);
//     }
//   };

//   // Blobdan real audio davomiyligini (sekund) olish
//   const getBlobDuration = async (blob: Blob): Promise<number> => {
//     try {
//       const arrayBuffer = await blob.arrayBuffer();
//       const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
//       const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
//       return Math.round(audioBuffer.duration); // real davomiylik (sekund)
//     } catch (e) {
//       console.error("Blob duration aniqlashda xato:", e);
//       return 0;
//     }
//   };


//   // Get current question
//   const getCurrentQuestion = () => {
//     if (!testData) return null;

//     const section = testData.sections[currentSectionIndex];
//     if (!section) return null;

//     // Check if section has subParts and they exist
//     if (section.subParts && section.subParts.length > 0) {
//       const subPart = section.subParts[currentSubPartIndex];
//       if (!subPart || !subPart.questions) return null;
//       return subPart.questions[currentQuestionIndex] || null;
//     } else {
//       // Direct questions in section
//       if (!section.questions || section.questions.length === 0) return null;
//       return section.questions[currentQuestionIndex] || null;
//     }
//   };

//   const currentQuestion = getCurrentQuestion();
//   const currentSection = testData?.sections[currentSectionIndex];

//   // Timer effects
//   useEffect(() => {
//     if (timeLeft > 0 && isRecording) {
//       timerRef.current = setTimeout(() => {
//         setTimeLeft(timeLeft - 1);
//       }, 1000);
//     } else if (timeLeft === 0 && isRecording) {
//       stopRecording();
//     }

//     return () => {
//       if (timerRef.current) {
//         clearTimeout(timerRef.current);
//       }
//     };
//   }, [timeLeft, isRecording]);

//   useEffect(() => {
//     if (isRecording) {
//       recordingTimerRef.current = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 1000);
//     } else {
//       if (recordingTimerRef.current) {
//         clearInterval(recordingTimerRef.current);
//       }
//     }

//     return () => {
//       if (recordingTimerRef.current) {
//         clearInterval(recordingTimerRef.current);
//       }
//     };
//   }, [isRecording]);

//   const startRecording = async () => {
//     try {
//       // Play start sound
//       playSound("start");

//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           sampleRate: 44100,
//         },
//       });

//       streamRef.current = stream;
//       chunksRef.current = [];

//       const mediaRecorder = new MediaRecorder(stream, {
//         mimeType: "audio/webm;codecs=opus",
//       });

//       mediaRecorderRef.current = mediaRecorder;

//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           chunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorder.onstop = async () => {
//         playSound("end");

//         const blob = new Blob(chunksRef.current, {
//           type: "audio/webm;codecs=opus",
//         });

//         if (currentQuestion) {
//           const duration = await getBlobDuration(blob); // ✅ endi 0 emas
//           const recording: Recording = {
//             blob,
//             duration,
//             questionId: currentQuestion.id,
//           };

//           setRecordings((prev) => new Map(prev.set(currentQuestion.id, recording)));

//           setTimeout(() => {
//             nextQuestion();
//           }, 2000);
//         }

//         if (streamRef.current) {
//           streamRef.current.getTracks().forEach((track) => track.stop());
//           streamRef.current = null;
//         }
//       };


//       mediaRecorder.start(100);
//       setIsRecording(true);
//       setRecordingTime(0);
//       // setAutoRecordingEnabled(true);
//     } catch (error) {
//       console.error("Error starting recording:", error);
//       toast.error("Mikrofon erişimi reddedildi");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//     }
//   };

//   const nextQuestion = () => {
//     if (audioRef.current && !audioRef.current.paused) {
//       toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz");
//       return;
//     }

//     if (isRecording) {
//       toast.error("Kayıt devam ederken sonraki soruya geçemezsiniz");
//       return;
//     }
//     if (!testData || !currentSection) return;

//     // Check if there are more questions in current subpart
//     if (currentSection.subParts.length > 0) {
//       const currentSubPart = currentSection.subParts[currentSubPartIndex];
//       if (currentQuestionIndex < currentSubPart.questions.length - 1) {
//         setCurrentQuestionIndex(currentQuestionIndex + 1);
//         setTimeLeft(30);
//         return;
//       }

//       // Check if there are more subparts
//       if (currentSubPartIndex < currentSection.subParts.length - 1) {
//         setCurrentSubPartIndex(currentSubPartIndex + 1);
//         setCurrentQuestionIndex(0);
//         setTimeLeft(30);
//         return;
//       }
//     } else {
//       // Direct questions in section
//       if (currentQuestionIndex < currentSection.questions.length - 1) {
//         setCurrentQuestionIndex(currentQuestionIndex + 1);
//         setTimeLeft(30);
//         return;
//       }
//     }

//     // Move to next section
//     if (currentSectionIndex < testData.sections.length - 1) {
//       setCurrentSectionIndex(currentSectionIndex + 1);
//       setCurrentSubPartIndex(0);
//       setCurrentQuestionIndex(0);
//       setShowSectionDescription(true);
//       setTimeLeft(30);
//     } else {
//       // Test is complete
//       console.log("Test completed! Total recordings:", recordings.size);
//       setIsTestComplete(true);
//     }
//   };

//   useEffect(() => {
//     return () => {
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current.currentTime = 0;
//       }
//       if (isRecording && mediaRecorderRef.current) {
//         mediaRecorderRef.current.stop();
//       }
//     };
//   }, []);

//   // startSection ichida audio tugamaguncha recording boshlanmasligi
//   const startSection = () => {
//     if (!testData) return;
//     if (audioRef.current && !audioRef.current.paused) {
//       toast.error("Mevcut bölümün talimatı bitmeden devam edemezsiniz");
//       return;
//     }
//     if (isPlayingInstructions && audioRef.current && !audioRef.current.paused) {
//       toast.error("Mevcut bölümün talimatı bitmeden devam edemezsiniz");
//       return;
//     }

//     const section = testData?.sections[currentSectionIndex];
//     if (!section) return;

//     setShowSectionDescription(false);
//     setTimeLeft(30);
//     const audioSrc = sectionAudios[section.order];
//     if (!audioSrc) {
//       startRecording();
//       return;
//     }
//     if (audioSrc) {
//       const audio = new Audio(audioSrc);
//       audioRef.current = audio;
//       setIsPlayingInstructions(true);

//       audio.onended = () => {
//         setIsPlayingInstructions(false);
//         setTimeout(() => {
//           if (!isRecording) startRecording();
//         }, 1000);
//       };

//       audio.onerror = () => {
//         setIsPlayingInstructions(false);
//         toast.error("Audio yüklenemedi");
//       };

//       audio.play().catch((err) => {
//         console.error("Audio play error:", err);
//         setIsPlayingInstructions(false);
//       });
//     }
//   };

//   const submitTest = async () => {
//     if (!testData) return;

//     setIsSubmitting(true);
//     try {
//       toast.info("Konuşmalarınız metne dönüştürülüyor...");

//       // 1) Barcha savollar uchun default javoblar (text="", duration=0) ni tayyorlab olamiz
//       const answerMap = new Map<string, { text: string; duration: number }>();

//       testData.sections.forEach((section) => {
//         if (section.subParts && section.subParts.length > 0) {
//           section.subParts.forEach((sp) => {
//             (sp.questions || []).forEach((q) => {
//               answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 });
//             });
//           });
//         } else {
//           (section.questions || []).forEach((q) => {
//             answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 });
//           });
//         }
//       });

//       // 2) Yozib olingan savollarni STT qilib, text va duration ni to‘ldiramiz
//       for (const [questionId, rec] of recordings) {
//         try {
//           const formData = new FormData();
//           formData.append("audio", rec.blob, "recording.webm");

//           const response = await axiosPrivate.post(
//             "/api/speaking-submission/speech-to-text",
//             formData,
//             {
//               headers: { "Content-Type": "multipart/form-data" },
//               timeout: 30000,
//             }
//           );

//           const userText = response.data?.text || "[Ses metne dönüştürülemedi]";
//           answerMap.set(questionId, { text: userText, duration: rec.duration });
//         } catch (error) {
//           console.error("Speech to text error for question:", questionId, error);
//           // duration baribir rec.duration bo‘lishi mumkin, text fallback
//           const prev = answerMap.get(questionId);
//           answerMap.set(questionId, {
//             text: "[Ses metne dönüştürülemedi]",
//             duration: rec.duration || prev?.duration || 0,
//           });
//         }
//       }

//       toast.info("Test gönderiliyor...");

//       // 3) Yuboriladigan ma’lumotni duration bilan birga yig‘amiz
//       const parts = testData.sections.map((section) => {
//         const part: any = {
//           description: section.description,
//           image: "",
//         };

//         if (section.subParts && section.subParts.length > 0) {
//           // SubPart’li bo‘lim
//           const subParts = section.subParts.map((sp) => {
//             const questions = (sp.questions || []).map((q) => {
//               const ans = answerMap.get(q.id);
//               return {
//                 questionId: q.id,
//                 userAnswer: ans?.text ?? "[Cevap bulunamadı]",
//                 duration: ans?.duration ?? 0,
//               };
//             });

//             const subPartDuration = questions.reduce(
//               (sum, q) => sum + (q.duration || 0),
//               0
//             );

//             return {
//               image: sp.images?.[0] || "",
//               duration: subPartDuration, // ✅ backend talab qiladi
//               questions,
//             };
//           });

//           const partDuration = subParts.reduce(
//             (sum, sp) => sum + (sp.duration || 0),
//             0
//           );

//           part.subParts = subParts;
//           part.duration = partDuration; // ✅ backend talab qiladi
//         } else {
//           // To‘g‘ridan-to‘g‘ri savollar
//           const questions = (section.questions || []).map((q) => {
//             const ans = answerMap.get(q.id);
//             return {
//               questionId: q.id,
//               userAnswer: ans?.text ?? "[Cevap bulunamadı]",
//               duration: ans?.duration ?? 0,
//             };
//           });

//           const partDuration = questions.reduce(
//             (sum, q) => sum + (q.duration || 0),
//             0
//           );

//           part.questions = questions;
//           part.duration = partDuration; // ✅ backend talab qiladi

//           if (section.type === "PART3") {
//             part.type = "DISADVANTAGE"; // kerak bo‘lsa
//           }
//         }

//         return part;
//       });

//       const submissionData = {
//         speakingTestId: testData.id,
//         parts,
//       };

//       // 4) POST
//       await axiosPrivate.post("/api/speaking-submission", submissionData);

//       toast.success("Test başarıyla gönderildi!");
//       navigate("/test");
//     } catch (error) {
//       console.error("Submission error:", error);
//       toast.error("Test gönderilirken hata oluştu");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, "0")}`;
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
//             <Mic className="w-8 h-8 text-white" />
//           </div>
//           <p className="text-xl text-black">Test yükleniyor...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!testData) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-xl text-black">Test bulunamadı</p>
//           <button
//             onClick={() => navigate("/test")}
//             className="mt-4 bg-red-600 text-white px-6 py-3 rounded"
//           >
//             Geri Dön
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (isTestComplete) {
//     console.log(
//       "Showing completion page - recordings:",
//       recordings.size,
//       "testData:",
//       testData?.title
//     );
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center p-4">
//         <div className="max-w-md mx-auto text-center">
//           <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
//             <CheckCircle className="w-10 h-10 text-white" />
//           </div>
//           <h1 className="text-3xl font-bold text-black mb-4">
//             Test Tamamlandı!
//           </h1>
//           <p className="text-lg text-black mb-6">
//             {recordings.size} soru cevaplanmıştır.
//           </p>
//           <div className="space-y-3">
//             <button
//               onClick={submitTest}
//               disabled={isSubmitting}
//               className="w-full bg-red-600 text-white font-bold py-4 px-6 text-lg rounded hover:bg-red-700 disabled:opacity-50"
//             >
//               {isSubmitting ? "Gönderiliyor..." : "Testi Gönder"}
//             </button>
//             <button
//               onClick={() => navigate("/test")}
//               className="w-full border-2 border-red-600 text-red-600 font-bold py-4 px-6 text-lg rounded hover:bg-red-600 hover:text-white"
//             >
//               Test Sayfasına Dön
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Show section description
//   if (showSectionDescription && currentSection) {
//     return (
//       <div className="min-h-screen bg-white">
//         {!micChecked ? (
//           <MicrophoneCheck onSuccess={() => setMicChecked(true)} />
//         ) : (
//           <>
//             <div className="bg-white border-b border-red-600">
//               <div className="max-w-4xl mx-auto px-4 py-4">
//                 <div className="flex items-center justify-between">
//                   <button
//                     onClick={() => navigate("/test")}
//                     className="flex items-center text-red-600 hover:text-red-700"
//                   >
//                     <ArrowLeft className="w-5 h-5 mr-2" />
//                     <span className="text-lg font-bold">Geri</span>
//                   </button>
//                   <h1 className="text-2xl font-bold text-black">
//                     {testData.title}
//                   </h1>
//                   <div className="text-lg text-black">
//                     Bölüm {currentSectionIndex + 1} / {testData.sections.length}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="max-w-4xl mx-auto px-4 py-8">
//               <div className="bg-white border-2 border-red-600 rounded-lg p-8 mb-8">
//                 <div className="text-center mb-6">
//                   <div className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-full text-lg font-bold mb-4">
//                     <Info className="w-5 h-5 mr-2" />
//                     {currentSection.title}
//                   </div>
//                   <h2 className="text-3xl font-bold text-black mb-6">
//                     Bölüm Açıklaması
//                   </h2>
//                   <div className="text-lg text-black leading-relaxed whitespace-pre-line max-w-3xl mx-auto">
//                     {currentSection.description}
//                   </div>
//                 </div>
//               </div>

//               <div className="text-center">
//                 <button
//                   onClick={startSection}
//                   className="bg-red-600 text-white font-bold py-4 px-8 text-xl rounded-lg hover:bg-red-700 shadow-lg"
//                 >
//                   Bölümü Başlat
//                 </button>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     );
//   }

//   // Show question interface
//   if (!currentQuestion) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 bg-red-600 rounded-full mx-auto flex items-center justify-center">
//             <span className="text-white text-2xl">!</span>
//           </div>
//           <h2 className="text-xl font-bold text-black">Soru Bulunamadı</h2>
//           <p className="text-gray-600">
//             Bölüm {currentSectionIndex + 1}, Alt Bölüm {currentSubPartIndex + 1}
//             , Soru {currentQuestionIndex + 1}
//           </p>
//           <button
//             onClick={nextQuestion}
//             className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
//           >
//             Sonraki Soruya Geç
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-white">
//       {/* Header */}
//       <div className="bg-white border-b border-red-600">
//         <div className="max-w-4xl mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <button
//               onClick={() => navigate("/test")}
//               className="flex items-center text-red-600 hover:text-red-700"
//             >
//               <ArrowLeft className="w-5 h-5 mr-2" />
//               <span className="text-lg font-bold">Geri</span>
//             </button>
//             <div className="text-center">
//               <h1 className="text-2xl font-bold text-black">
//                 {testData.title}
//               </h1>
//               <div className="flex items-center justify-center gap-2 mt-1">
//                 <div className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
//                   {currentSection?.title}
//                 </div>
//                 <span className="text-sm text-gray-600">•</span>
//                 <span className="text-sm text-gray-600">
//                   Soru {currentQuestionIndex + 1}
//                 </span>
//               </div>
//             </div>
//             <div className="text-lg font-bold text-black">
//               Bölüm {currentSectionIndex + 1} / {testData.sections.length}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="max-w-4xl mx-auto px-4 py-6">
//         {/* Question Card */}
//         <div className="bg-white border-2 border-red-600 rounded-lg p-8 mb-6">
//           {/* Show images if available */}
//           {currentSection?.subParts &&
//             currentSection.subParts[currentSubPartIndex]?.images &&
//             currentSection.subParts[currentSubPartIndex].images.length > 0 && (
//               <div className="mb-6">
//                 <img
//                   src={currentSection.subParts[currentSubPartIndex].images[0]}
//                   alt="Test görseli"
//                   className="max-w-md mx-auto rounded-lg shadow-lg"
//                 />
//               </div>
//             )}

//           <div className="text-center">
//             <h2 className="text-3xl font-bold text-black leading-relaxed">
//               {currentQuestion.questionText}
//             </h2>
//           </div>

//           {/* Debug info - remove in production */}
//           <div className="mt-4 text-xs text-gray-500 text-center">
//             Debug: Section {currentSectionIndex + 1}, SubPart{" "}
//             {currentSubPartIndex + 1}, Question {currentQuestionIndex + 1}
//           </div>
//         </div>

//         {/* Recording Controls */}


//         {/* Status Row */}
//         <div className="grid grid-cols-3 gap-4 mb-6">
//           <div className="bg-red-600 text-white rounded-lg p-4 text-center">
//             <Clock className="w-6 h-6 mx-auto mb-2 text-white" />
//             <div className="text-sm font-bold">Kalan Süre</div>
//             <div className="text-2xl font-bold text-white">
//               {formatTime(timeLeft)}
//             </div>
//           </div>

//           <div className="bg-white border-2 border-red-600 rounded-lg p-4 text-center">
//             <div className="w-6 h-6 mx-auto mb-2 bg-red-600 rounded-full"></div>
//             <div className="text-sm font-bold text-black">Kayıt Süresi</div>
//             <div className="text-2xl font-bold text-red-600">
//               {formatTime(recordingTime)}
//             </div>
//           </div>

//           <div className="bg-white border-2 border-red-600 rounded-lg p-4 text-center">
//             <div className="w-6 h-6 mx-auto mb-2">
//               {isRecording ? (
//                 <div className="w-6 h-6 bg-red-600 rounded-full animate-pulse"></div>
//               ) : recordings.has(currentQuestion.id) ? (
//                 <CheckCircle className="w-6 h-6 text-red-600" />
//               ) : (
//                 <div className="w-6 h-6 border-2 border-red-600 rounded-full"></div>
//               )}
//             </div>
//             <div className="text-sm font-bold text-black">Durum</div>
//             <div className="text-lg font-bold">
//               {isPlayingInstructions ? (
//                 <span className="text-blue-600">TALİMAT</span>
//               ) : isRecording ? (
//                 <span className="text-red-600">KAYIT</span>
//               ) : recordings.has(currentQuestion.id) ? (
//                 <span className="text-red-600">TAMAM</span>
//               ) : (
//                 <span className="text-black">HAZIR</span>
//               )}
//             </div>
//           </div>
//         </div>
//         <div className="text-center mb-6">
//           {isPlayingInstructions ? (
//             <div className="space-y-4">
//               <div className="text-6xl">🔊</div>
//               <p className="text-2xl font-bold text-black">
//                 Talimat dinleniyor...
//               </p>
//             </div>
//           ) : !isRecording ? (
//             <div className="space-y-4">
//               <button
//                 onClick={startRecording}
//                 disabled={isPlayingInstructions}
//                 className="bg-red-600 text-white p-6 rounded-full hover:bg-red-700 shadow-lg disabled:opacity-50"
//               >
//                 <Mic className="w-10 h-10" />
//               </button>
//               <p className="text-lg font-bold text-black">
//                 Konuşmaya başlamak için tıklayın
//               </p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="flex justify-center items-center space-x-4">
//                 <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
//                   <Mic className="w-10 h-10 text-white" />
//                 </div>
//                 <button
//                   onClick={stopRecording}
//                   className="bg-gray-600 text-white p-4 rounded-full hover:bg-gray-700"
//                 >
//                   <Square className="w-8 h-8" />
//                 </button>
//               </div>
//               <p className="text-xl font-bold text-red-600">
//                 🔴 Kayıt devam ediyor...
//               </p>
//               <p className="text-sm text-gray-600">
//                 Bitirmek için durdur butonuna tıklayın
//               </p>
//             </div>
//           )}
//         </div>
//         {/* Navigation */}
//         <div className="flex justify-between items-center">
//           <button
//             onClick={() => setIsTestComplete(true)}
//             className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
//           >
//             Test Bitir (Debug)
//           </button>

//           <div className="text-center">
//             {recordings.has(currentQuestion.id) && (
//               <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">
//                 ✓ Cevaplandı
//               </div>
//             )}
//           </div>

//           <button
//             onClick={nextQuestion}
//             disabled={isRecording}
//             className={`px-6 py-3 text-lg font-bold rounded-lg ${isRecording
//               ? "bg-red-600 text-white opacity-50 cursor-not-allowed"
//               : "bg-red-600 text-white hover:bg-red-700"
//               }`}
//           >
//             Sonraki →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ImprovedSpeakingTest;






// import { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { Mic, Square, ArrowLeft, CheckCircle, Info, Clock } from "lucide-react";
// import axiosPrivate from "@/config/api";
// import { toast } from "sonner";
// import { MicrophoneCheck } from "./components/MicrophoneCheck";

// interface Question {
//   id: string;
//   questionText: string;
//   order: number;
//   subPartId?: string;
//   sectionId?: string;
// }

// interface SubPart {
//   id: string;
//   label: string;
//   description: string;
//   images: string[];
//   questions: Question[];
// }

// interface Section {
//   id: string;
//   title: string;
//   description: string;
//   type: string;
//   order: number;
//   subParts: SubPart[];
//   questions: Question[];
// }

// interface SpeakingTestData {
//   id: string;
//   title: string;
//   sections: Section[];
// }

// interface Recording {
//   blob: Blob;
//   duration: number;
//   questionId: string;
// }

// const sectionAudios: Record<number, string> = {
//   1: "/speakingpart1.mp3",
//   2: "/speakingpart2.mp3",
//   3: "/speakingpart3.mp3",
// };

// const RECORD_SECONDS_PER_QUESTION = 30; // easy to change in one place

// const ImprovedSpeakingTest = () => {
//   const { testId } = useParams();
//   const navigate = useNavigate();

//   // State
//   const [testData, setTestData] = useState<SpeakingTestData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
//   const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [showSectionDescription, setShowSectionDescription] = useState(true);
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordings, setRecordings] = useState<Map<string, Recording>>(new Map());
//   const [micChecked, setMicChecked] = useState(false);
//   const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS_PER_QUESTION);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [isTestComplete, setIsTestComplete] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isPlayingInstructions, setIsPlayingInstructions] = useState(false);

//   // Refs
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chunksRef = useRef<Blob[]>([]);
//   const countdownRef = useRef<number | null>(null);
//   const elapsedRef = useRef<number | null>(null);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const startSoundRef = useRef<HTMLAudioElement | null>(null);
//   const endSoundRef = useRef<HTMLAudioElement | null>(null);

//   // Load test data & init click sounds
//   useEffect(() => {
//     const init = async () => {
//       try {
//         if (testId) {
//           const response = await axiosPrivate.get(`/api/speaking-test/${testId}`);
//           setTestData(response.data);
//         }
//       } catch (err) {
//         console.error("Error fetching test data:", err);
//         toast.error("Test verisi yüklenemedi");
//       } finally {
//         setLoading(false);
//       }
//     };
//     init();

//     // click / stop beeps (tiny inline wav)
//     startSoundRef.current = new Audio(
//       "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V"
//     );
//     endSoundRef.current = new Audio(
//       "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V"
//     );

//     return () => {
//       cleanupAudio();
//       cleanupMedia();
//       clearTimers();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [testId]);

//   const clearTimers = () => {
//     if (countdownRef.current) {
//       window.clearInterval(countdownRef.current);
//       countdownRef.current = null;
//     }
//     if (elapsedRef.current) {
//       window.clearInterval(elapsedRef.current);
//       elapsedRef.current = null;
//     }
//   };

//   const cleanupAudio = () => {
//     if (audioRef.current) {
//       audioRef.current.pause();
//       audioRef.current.currentTime = 0;
//       audioRef.current = null;
//     }
//   };

//   const cleanupMedia = () => {
//     try {
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//         mediaRecorderRef.current.stop();
//       }
//     } catch {}
//     mediaRecorderRef.current = null;
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((t) => t.stop());
//       streamRef.current = null;
//     }
//   };

//   const playSound = (type: "start" | "end") => {
//     try {
//       const el = type === "start" ? startSoundRef.current : endSoundRef.current;
//       el && (el.currentTime = 0) && el.play().catch(() => {});
//     } catch (e) {
//       console.error("beep error", e);
//     }
//   };

//   // Robust blob duration (seconds)
//   const getBlobDuration = async (blob: Blob): Promise<number> => {
//     try {
//       const arrayBuffer = await blob.arrayBuffer();
//       const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
//       const ctx = new AudioCtx();
//       const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
//       const dur = Math.round(buf.duration);
//       // Avoid hitting AudioContext limits by closing if supported
//       // @ts-ignore
//       if (ctx.close) await ctx.close();
//       return dur;
//     } catch (e) {
//       console.error("Blob duration error:", e);
//       return 0;
//     }
//   };

//   // Current helpers
//   const getCurrentSection = () => testData?.sections?.[currentSectionIndex];

//   const getCurrentQuestion = (): Question | null => {
//     const section = getCurrentSection();
//     if (!section) return null;

//     // Prefer subParts if present; otherwise direct questions
//     if (Array.isArray(section.subParts) && section.subParts.length > 0) {
//       const sp = section.subParts[currentSubPartIndex];
//       const q = sp?.questions?.[currentQuestionIndex];
//       return q ?? null;
//     }
//     const q = section.questions?.[currentQuestionIndex];
//     return q ?? null;
//   };

//   const currentQuestion = getCurrentQuestion();
//   const currentSection = getCurrentSection();

//   // Countdown while recording
//   useEffect(() => {
//     if (!isRecording) return;

//     // countdown seconds left
//     countdownRef.current = window.setInterval(() => {
//       setTimeLeft((prev) => {
//         if (prev <= 1) {
//           // auto-stop when reaches 0
//           stopRecording();
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     // elapsed timer
//     elapsedRef.current = window.setInterval(() => {
//       setRecordingTime((prev) => prev + 1);
//     }, 1000);

//     return () => {
//       clearTimers();
//     };
//   }, [isRecording]);

//   const startRecording = async () => {
//     try {
//       if (isPlayingInstructions) {
//         toast.error("Talimat bitmeden kayıt başlatılamaz");
//         return;
//       }

//       playSound("start");
//       // Reset timers for this question
//       setTimeLeft(RECORD_SECONDS_PER_QUESTION);
//       setRecordingTime(0);

//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           sampleRate: 44100,
//         },
//       });

//       streamRef.current = stream;
//       chunksRef.current = [];

//       const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
//         ? "audio/webm;codecs=opus"
//         : undefined; // let browser decide
//       const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
//       mediaRecorderRef.current = mr;

//       mr.ondataavailable = (e) => {
//         if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
//       };

//       mr.onstop = async () => {
//         playSound("end");
//         clearTimers();

//         const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
//         chunksRef.current = [];

//         const q = getCurrentQuestion();
//         if (q) {
//           const duration = await getBlobDuration(blob);
//           const rec: Recording = { blob, duration, questionId: q.id };
//           setRecordings((prev) => {
//             const next = new Map(prev);
//             next.set(q.id, rec);
//             return next;
//           });
//           // Auto-advance slightly after stop
//           setTimeout(() => {
//             nextQuestion();
//           }, 800);
//         }

//         cleanupMedia();
//       };

//       mr.start(100); // gather data in small chunks
//       setIsRecording(true);
//     } catch (e) {
//       console.error("startRecording error", e);
//       toast.error("Mikrofon erişimi reddedildi veya başlatılamadı");
//       cleanupMedia();
//       clearTimers();
//       setIsRecording(false);
//     }
//   };

//   const stopRecording = () => {
//     try {
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//         mediaRecorderRef.current.stop();
//       }
//     } catch (e) {
//       console.error("stopRecording error", e);
//     } finally {
//       setIsRecording(false);
//     }
//   };

//   const nextQuestion = () => {
//     if (audioRef.current && !audioRef.current.paused) {
//       toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz");
//       return;
//     }
//     if (isPlayingInstructions) {
//       toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz");
//       return;
//     }
//     if (isRecording) {
//       toast.error("Kayıt devam ederken sonraki soruya geçemezsiniz");
//       return;
//     }

//     if (!testData) return;
//     const section = getCurrentSection();
//     if (!section) return;

//     // move within subparts
//     if (Array.isArray(section.subParts) && section.subParts.length > 0) {
//       const sp = section.subParts[currentSubPartIndex];
//       const qLen = sp?.questions?.length ?? 0;
//       if (currentQuestionIndex < qLen - 1) {
//         setCurrentQuestionIndex((i) => i + 1);
//         resetPerQuestionState();
//         return;
//       }
//       // next subpart
//       if (currentSubPartIndex < section.subParts.length - 1) {
//         setCurrentSubPartIndex((i) => i + 1);
//         setCurrentQuestionIndex(0);
//         resetPerQuestionState();
//         return;
//       }
//     } else {
//       // direct questions
//       const qLen = section.questions?.length ?? 0;
//       if (currentQuestionIndex < qLen - 1) {
//         setCurrentQuestionIndex((i) => i + 1);
//         resetPerQuestionState();
//         return;
//       }
//     }

//     // move to next section or complete
//     if (currentSectionIndex < testData.sections.length - 1) {
//       setCurrentSectionIndex((i) => i + 1);
//       setCurrentSubPartIndex(0);
//       setCurrentQuestionIndex(0);
//       setShowSectionDescription(true);
//       resetPerQuestionState();
//     } else {
//       setIsTestComplete(true);
//     }
//   };

//   const resetPerQuestionState = () => {
//     setTimeLeft(RECORD_SECONDS_PER_QUESTION);
//     setRecordingTime(0);
//   };

//   // Start section with optional instruction audio; only begin recording after it ends.
//   const startSection = () => {
//     if (!testData) return;
//     if (audioRef.current && !audioRef.current.paused) {
//       toast.error("Mevcut bölümün talimatı bitmeden devam edemezsiniz");
//       return;
//     }
//     if (isPlayingInstructions) {
//       toast.error("Mevcut bölümün talimatı bitmeden devam edemezsiniz");
//       return;
//     }

//     const section = getCurrentSection();
//     if (!section) return;

//     setShowSectionDescription(false);
//     resetPerQuestionState();

//     const audioSrc = sectionAudios[section.order];
//     if (!audioSrc) {
//       // No instruction audio — start recording immediately
//       startRecording();
//       return;
//     }

//     const audio = new Audio(audioSrc);
//     audioRef.current = audio;
//     setIsPlayingInstructions(true);

//     audio.onended = () => {
//       setIsPlayingInstructions(false);
//       // small grace period then auto-start
//       setTimeout(() => {
//         if (!isRecording) startRecording();
//       }, 800);
//     };

//     audio.onerror = () => {
//       setIsPlayingInstructions(false);
//       toast.error("Audio yüklenemedi");
//     };

//     audio.play().catch((err) => {
//       console.error("Audio play error:", err);
//       setIsPlayingInstructions(false);
//     });
//   };

//   const submitTest = async () => {
//     if (!testData) return;

//     setIsSubmitting(true);
//     try {
//       toast.info("Konuşmalarınız metne dönüştürülüyor...");

//       // 1) Prepare default answers for all questions
//       const answerMap = new Map<string, { text: string; duration: number }>();

//       testData.sections.forEach((section) => {
//         if (section.subParts && section.subParts.length > 0) {
//           section.subParts.forEach((sp) => {
//             (sp.questions || []).forEach((q) => {
//               answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 });
//             });
//           });
//         } else {
//           (section.questions || []).forEach((q) => {
//             answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 });
//           });
//         }
//       });

//       // 2) STT for recorded ones
//       for (const [questionId, rec] of recordings) {
//         try {
//           const formData = new FormData();
//           formData.append("audio", rec.blob, "recording.webm");

//           const response = await axiosPrivate.post(
//             "/api/speaking-submission/speech-to-text",
//             formData,
//             {
//               headers: { "Content-Type": "multipart/form-data" },
//               timeout: 30000,
//             }
//           );

//           const userText = response.data?.text || "[Ses metne dönüştürülemedi]";
//           answerMap.set(questionId, { text: userText, duration: rec.duration });
//         } catch (error) {
//           console.error("Speech to text error for question:", questionId, error);
//           const prev = answerMap.get(questionId);
//           answerMap.set(questionId, {
//             text: "[Ses metne dönüştürülemedi]",
//             duration: rec.duration || prev?.duration || 0,
//           });
//         }
//       }

//       toast.info("Test gönderiliyor...");

//       // 3) Build payload including durations
//       const parts = testData.sections.map((section) => {
//         const part: any = {
//           description: section.description,
//           image: "",
//         } as any;

//         if (section.subParts && section.subParts.length > 0) {
//           const subParts = section.subParts.map((sp) => {
//             const questions = (sp.questions || []).map((q) => {
//               const ans = answerMap.get(q.id);
//               return {
//                 questionId: q.id,
//                 userAnswer: ans?.text ?? "[Cevap bulunamadı]",
//                 duration: ans?.duration ?? 0,
//               };
//             });
//             const subPartDuration = questions.reduce((sum, q) => sum + (q.duration || 0), 0);
//             return {
//               image: sp.images?.[0] || "",
//               duration: subPartDuration,
//               questions,
//             };
//           });

//           const partDuration = subParts.reduce((sum, sp) => sum + (sp.duration || 0), 0);
//           part.subParts = subParts;
//           part.duration = partDuration;
//         } else {
//           const questions = (section.questions || []).map((q) => {
//             const ans = answerMap.get(q.id);
//             return {
//               questionId: q.id,
//               userAnswer: ans?.text ?? "[Cevap bulunamadı]",
//               duration: ans?.duration ?? 0,
//             };
//           });
//           const partDuration = questions.reduce((sum, q) => sum + (q.duration || 0), 0);
//           part.questions = questions;
//           part.duration = partDuration;

//           if (section.type === "PART3") {
//             part.type = "DISADVANTAGE"; // optional, if backend expects
//           }
//         }

//         return part;
//       });

//       const submissionData = {
//         speakingTestId: testData.id,
//         parts,
//       };

//       await axiosPrivate.post("/api/speaking-submission", submissionData);

//       toast.success("Test başarıyla gönderildi!");
//       navigate("/test");
//     } catch (error) {
//       console.error("Submission error:", error);
//       toast.error("Test gönderilirken hata oluştu");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, "0")}`;
//   };

//   // ---------- RENDER ----------
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
//             <Mic className="w-8 h-8 text-white" />
//           </div>
//           <p className="text-xl text-black">Test yükleniyor...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!testData) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-xl text-black">Test bulunamadı</p>
//           <button onClick={() => navigate("/test")} className="mt-4 bg-red-600 text-white px-6 py-3 rounded">
//             Geri Dön
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (isTestComplete) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center p-4">
//         <div className="max-w-md mx-auto text-center">
//           <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
//             <CheckCircle className="w-10 h-10 text-white" />
//           </div>
//           <h1 className="text-3xl font-bold text-black mb-4">Test Tamamlandı!</h1>
//           <p className="text-lg text-black mb-6">{recordings.size} soru cevaplanmıştır.</p>
//           <div className="space-y-3">
//             <button onClick={submitTest} disabled={isSubmitting} className="w-full bg-red-600 text-white font-bold py-4 px-6 text-lg rounded hover:bg-red-700 disabled:opacity-50">
//               {isSubmitting ? "Gönderiliyor..." : "Testi Gönder"}
//             </button>
//             <button onClick={() => navigate("/test")} className="w-full border-2 border-red-600 text-red-600 font-bold py-4 px-6 text-lg rounded hover:bg-red-600 hover:text-white">
//               Test Sayfasına Dön
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Section intro (with MicrophoneCheck)
//   if (showSectionDescription && currentSection) {
//     return (
//       <div className="min-h-screen bg-white">
//         {!micChecked ? (
//           <MicrophoneCheck onSuccess={() => setMicChecked(true)} />
//         ) : (
//           <>
//             <div className="bg-white border-b border-red-600">
//               <div className="max-w-4xl mx-auto px-4 py-4">
//                 <div className="flex items-center justify-between">
//                   <button onClick={() => navigate("/test")} className="flex items-center text-red-600 hover:text-red-700">
//                     <ArrowLeft className="w-5 h-5 mr-2" />
//                     <span className="text-lg font-bold">Geri</span>
//                   </button>
//                   <h1 className="text-2xl font-bold text-black">{testData.title}</h1>
//                   <div className="text-lg text-black">Bölüm {currentSectionIndex + 1} / {testData.sections.length}</div>
//                 </div>
//               </div>
//             </div>

//             <div className="max-w-4xl mx-auto px-4 py-8">
//               <div className="bg-white border-2 border-red-600 rounded-lg p-8 mb-8">
//                 <div className="text-center mb-6">
//                   <div className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-full text-lg font-bold mb-4">
//                     <Info className="w-5 h-5 mr-2" />
//                     {currentSection.title}
//                   </div>
//                   <h2 className="text-3xl font-bold text-black mb-6">Bölüm Açıklaması</h2>
//                   <div className="text-lg text-black leading-relaxed whitespace-pre-line max-w-3xl mx-auto">
//                     {currentSection.description}
//                   </div>
//                 </div>
//               </div>

//               <div className="text-center">
//                 <button onClick={startSection} className="bg-red-600 text-white font-bold py-4 px-8 text-xl rounded-lg hover:bg-red-700 shadow-lg">
//                   Bölümü Başlat
//                 </button>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     );
//   }

//   // Question UI
//   if (!currentQuestion) {
//     return (
//       <div className="min-h-screen bg-white flex items-center justify-center">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 bg-red-600 rounded-full mx-auto flex items-center justify-center">
//             <span className="text-white text-2xl">!</span>
//           </div>
//           <h2 className="text-xl font-bold text-black">Soru Bulunamadı</h2>
//           <p className="text-gray-600">
//             Bölüm {currentSectionIndex + 1}, Alt Bölüm {currentSubPartIndex + 1}, Soru {currentQuestionIndex + 1}
//           </p>
//           <button onClick={nextQuestion} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">
//             Sonraki Soruya Geç
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-white">
//       {/* Header */}
//       <div className="bg-white border-b border-red-600">
//         <div className="max-w-4xl mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <button onClick={() => navigate("/test")} className="flex items-center text-red-600 hover:text-red-700">
//               <ArrowLeft className="w-5 h-5 mr-2" />
//               <span className="text-lg font-bold">Geri</span>
//             </button>
//             <div className="text-center">
//               <h1 className="text-2xl font-bold text-black">{testData.title}</h1>
//               <div className="flex items-center justify-center gap-2 mt-1">
//                 <div className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
//                   {currentSection?.title}
//                 </div>
//                 <span className="text-sm text-gray-600">•</span>
//                 <span className="text-sm text-gray-600">Soru {currentQuestionIndex + 1}</span>
//               </div>
//             </div>
//             <div className="text-lg font-bold text-black">Bölüm {currentSectionIndex + 1} / {testData.sections.length}</div>
//           </div>
//         </div>
//       </div>

//       {/* Main */}
//       <div className="max-w-4xl mx-auto px-4 py-6">
//         {/* Question Card */}
//         <div className="bg-white border-2 border-red-600 rounded-lg p-8 mb-6">
//           {currentSection?.subParts?.[currentSubPartIndex]?.images?.length ? (
//             <div className="mb-6">
//               <img
//                 src={currentSection.subParts[currentSubPartIndex].images[0]}
//                 alt="Test görseli"
//                 className="max-w-md mx-auto rounded-lg shadow-lg"
//               />
//             </div>
//           ) : null}

//           <div className="text-center">
//             <h2 className="text-3xl font-bold text-black leading-relaxed">{currentQuestion.questionText}</h2>
//           </div>

//           <div className="mt-4 text-xs text-gray-500 text-center">
//             Debug: Section {currentSectionIndex + 1}, SubPart {currentSubPartIndex + 1}, Question {currentQuestionIndex + 1}
//           </div>
//         </div>

//         {/* Recording Controls */}
//         <div className="flex items-center justify-center gap-4 mb-6">
//           {!isRecording ? (
//             <button
//               onClick={startRecording}
//               disabled={isPlayingInstructions}
//               className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-red-700 disabled:opacity-50"
//             >
//               <Mic className="w-5 h-5" /> Kaydı Başlat
//             </button>
//           ) : (
//             <button
//               onClick={stopRecording}
//               className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-gray-700"
//             >
//               <Square className="w-5 h-5" /> Kaydı Durdur
//             </button>
//           )}
//         </div>

//         {/* Status Row */}
//         <div className="grid grid-cols-3 gap-4 mb-6">
//           <div className="bg-red-600 text-white rounded-lg p-4 text-center">
//             <Clock className="w-6 h-6 mx-auto mb-2" />
//             <div className="text-sm font-bold">Kalan Süre</div>
//             <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
//           </div>

//           <div className="bg-white border-2 border-red-600 rounded-lg p-4 text-center">
//             <div className="w-6 h-6 mx-auto mb-2 bg-red-600 rounded-full"></div>
//             <div className="text-sm font-bold text-black">Kayıt Süresi</div>
//             <div className="text-2xl font-bold text-red-600">{formatTime(recordingTime)}</div>
//           </div>

//           <div className="bg-white border-2 border-red-600 rounded-lg p-4 text-center">
//             <div className="w-6 h-6 mx-auto mb-2">
//               {isRecording ? (
//                 <div className="w-6 h-6 bg-red-600 rounded-full animate-pulse"></div>
//               ) : recordings.has(currentQuestion.id) ? (
//                 <CheckCircle className="w-6 h-6 text-red-600" />
//               ) : (
//                 <div className="w-6 h-6 border-2 border-red-600 rounded-full"></div>
//               )}
//             </div>
//             <div className="text-sm font-bold text-black">Durum</div>
//             <div className="text-lg font-bold">
//               {isPlayingInstructions ? (
//                 <span className="text-blue-600">TALİMAT</span>
//               ) : isRecording ? (
//                 <span className="text-red-600">KAYIT</span>
//               ) : recordings.has(currentQuestion.id) ? (
//                 <span className="text-red-600">TAMAM</span>
//               ) : (
//                 <span className="text-black">HAZIR</span>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Instruction banner / big button state */}
//         <div className="text-center mb-6">
//           {isPlayingInstructions ? (
//             <div className="space-y-4">
//               <div className="text-6xl">🔊</div>
//               <p className="text-2xl font-bold text-black">Talimat dinleniyor...</p>
//             </div>
//           ) : null}
//         </div>

//         {/* Navigation */}
//         <div className="flex justify-between items-center">
//           <button onClick={() => setIsTestComplete(true)} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
//             Test Bitir (Debug)
//           </button>

//           <div className="text-center">
//             {recordings.has(currentQuestion.id) && (
//               <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">✓ Cevaplandı</div>
//             )}
//           </div>

//           <button
//             onClick={nextQuestion}
//             disabled={isRecording || isPlayingInstructions}
//             className={`px-6 py-3 text-lg font-bold rounded-lg ${
//               isRecording || isPlayingInstructions
//                 ? "bg-red-600 text-white opacity-50 cursor-not-allowed"
//                 : "bg-red-600 text-white hover:bg-red-700"
//             }`}
//           >
//             Sonraki →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ImprovedSpeakingTest;























import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  ArrowLeft,
  CheckCircle,
  Info,
  Clock,
  Play,
  Pause,
} from "lucide-react";
import axiosPrivate from "@/config/api";
import { toast } from "sonner";
import { MicrophoneCheck } from "./components/MicrophoneCheck";

interface Question {
  id: string;
  questionText: string;
  order: number;
  subPartId?: string;
  sectionId?: string;
}

interface SubPart {
  id: string;
  label: string;
  description: string;
  images: string[];
  questions: Question[];
}

interface Section {
  id: string;
  title: string;
  description: string;
  type: string;
  order: number;
  subParts: SubPart[];
  questions: Question[];
}

interface SpeakingTestData {
  id: string;
  title: string;
  sections: Section[];
}

interface Recording {
  blob: Blob;
  duration: number;
  questionId: string;
}

const RECORD_SECONDS_PER_QUESTION = 30;

const sectionAudios: Record<number, string> = {
  1: "/speakingpart1.mp3",
  2: "/speakingpart2.mp3",
  3: "/speakingpart3.mp3",
};

export default function ImprovedSpeakingTest() {
  const { testId } = useParams();
  const navigate = useNavigate();

  // data / flow
  const [testData, setTestData] = useState<SpeakingTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [micChecked, setMicChecked] = useState(false);
  const [showSectionDescription, setShowSectionDescription] = useState(true);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentSubPartIndex, setCurrentSubPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlayingInstructions, setIsPlayingInstructions] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS_PER_QUESTION);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Map<string, Recording>>(new Map());

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<number | null>(null);
  const elapsedRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startSoundRef = useRef<HTMLAudioElement | null>(null);
  const endSoundRef = useRef<HTMLAudioElement | null>(null);

  // fetch test
  useEffect(() => {
    (async () => {
      try {
        const res = await axiosPrivate.get(`/api/speaking-test/${testId}`);
        setTestData(res.data);
      } catch (e) {
        console.error(e);
        toast.error("Test verisi yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();

    // init beeps
    startSoundRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V"
    );
    endSoundRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmshBziI0vPXeCsFJG7C7+WQPQ0PVKzl7axeBg4+o+HzultYFjLK4vK0V"
    );

    return () => {
      stopAllAudio();
      cleanupMedia();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // utils
  const playSound = (type: "start" | "end") => {
    try {
      const el = type === "start" ? startSoundRef.current : endSoundRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } catch {}
  };

  const clearTimers = () => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (elapsedRef.current) {
      window.clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const cleanupMedia = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const getBlobDuration = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
      // @ts-ignore
      if (ctx.close) await ctx.close();
      return Math.round(buf.duration);
    } catch (e) {
      console.error("duration error", e);
      return 0;
    }
  };

  const currentSection = testData?.sections?.[currentSectionIndex];
  const currentQuestion: Question | null = (() => {
    const sec = currentSection;
    if (!sec) return null;
    if (sec.subParts?.length) {
      return sec.subParts[currentSubPartIndex]?.questions?.[currentQuestionIndex] ?? null;
    }
    return sec.questions?.[currentQuestionIndex] ?? null;
  })();

  // timers while recording
  useEffect(() => {
    if (!isRecording || isPaused) return;

    countdownRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    elapsedRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearTimers();
  }, [isRecording, isPaused]);

  // recording controls
  const startRecording = async () => {
    try {
      if (isPlayingInstructions) {
        toast.error("Talimat bitmeden kayıt başlatılamaz");
        return;
      }
      playSound("start");
      setTimeLeft(RECORD_SECONDS_PER_QUESTION);
      setRecordingTime(0);
      setIsPaused(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const supported = MediaRecorder.isTypeSupported("audio/webm;codecs=opus");
      const mr = new MediaRecorder(stream, supported ? { mimeType: "audio/webm;codecs=opus" } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => e.data?.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        playSound("end");
        clearTimers();
        const blob = new Blob(chunksRef.current, { type: supported ? "audio/webm;codecs=opus" : "audio/webm" });
        chunksRef.current = [];
        if (currentQuestion) {
          const duration = await getBlobDuration(blob);
          const rec: Recording = { blob, duration, questionId: currentQuestion.id };
          setRecordings((prev) => new Map(prev).set(currentQuestion.id, rec));
          // smooth auto-next
          setTimeout(() => nextQuestion(), 900);
        }
        cleanupMedia();
      };

      mr.start(100);
      setIsRecording(true);
    } catch (e) {
      console.error("start error", e);
      toast.error("Mikrofon erişimi reddedildi veya başlatılamadı");
      cleanupMedia();
      clearTimers();
      setIsRecording(false);
    }
  };

  const pauseRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        clearTimers();
      }
    } catch {}
  };

  const resumeRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      }
    } catch {}
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    setIsRecording(false);
    setIsPaused(false);
  };

  const resetPerQuestionState = () => {
    setTimeLeft(RECORD_SECONDS_PER_QUESTION);
    setRecordingTime(0);
    setIsPaused(false);
  };

  const nextQuestion = () => {
    if (audioRef.current && !audioRef.current.paused) {
      toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz");
      return;
    }
    if (isPlayingInstructions) {
      toast.error("Ses talimatı bitmeden sonraki soruya geçemezsiniz");
      return;
    }
    if (isRecording) {
      toast.error("Kayıt devam ederken sonraki soruya geçemezsiniz");
      return;
    }

    if (!testData || !currentSection) return;

    if (currentSection.subParts?.length) {
      const sp = currentSection.subParts[currentSubPartIndex];
      const qLen = sp?.questions?.length ?? 0;
      if (currentQuestionIndex < qLen - 1) {
        setCurrentQuestionIndex((i) => i + 1);
        resetPerQuestionState();
        return;
      }
      if (currentSubPartIndex < currentSection.subParts.length - 1) {
        setCurrentSubPartIndex((i) => i + 1);
        setCurrentQuestionIndex(0);
        resetPerQuestionState();
        return;
      }
    } else {
      const qLen = currentSection.questions?.length ?? 0;
      if (currentQuestionIndex < qLen - 1) {
        setCurrentQuestionIndex((i) => i + 1);
        resetPerQuestionState();
        return;
      }
    }

    if (currentSectionIndex < (testData.sections?.length ?? 0) - 1) {
      setCurrentSectionIndex((i) => i + 1);
      setCurrentSubPartIndex(0);
      setCurrentQuestionIndex(0);
      setShowSectionDescription(true);
      resetPerQuestionState();
    } else {
      setIsTestComplete(true);
    }
  };

  const startSection = () => {
    if (!testData) return;
    if (audioRef.current && !audioRef.current.paused) return;
    if (isPlayingInstructions) return;

    const section = currentSection;
    if (!section) return;

    setShowSectionDescription(false);
    resetPerQuestionState();

    const src = sectionAudios[section.order];
    if (!src) {
      startRecording();
      return;
    }

    const audio = new Audio(src);
    audioRef.current = audio;
    setIsPlayingInstructions(true);
    audio.onended = () => {
      setIsPlayingInstructions(false);
      setTimeout(() => !isRecording && startRecording(), 700);
    };
    audio.onerror = () => {
      setIsPlayingInstructions(false);
      toast.error("Audio yüklenemedi");
    };
    audio.play().catch(() => setIsPlayingInstructions(false));
  };

  const submitTest = async () => {
    if (!testData) return;
    setIsSubmitting(true);
    try {
      toast.info("Konuşmalarınız metne dönüştürülüyor...");
      const answerMap = new Map<string, { text: string; duration: number }>();
      testData.sections.forEach((s) => {
        if (s.subParts?.length) s.subParts.forEach((sp) => sp.questions.forEach((q) => answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 })));
        else s.questions.forEach((q) => answerMap.set(q.id, { text: "[Cevap bulunamadı]", duration: 0 }));
      });

      for (const [qid, rec] of recordings) {
        try {
          const fd = new FormData();
          fd.append("audio", rec.blob, "recording.webm");
          const res = await axiosPrivate.post("/api/speaking-submission/speech-to-text", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
          });
          const text = res.data?.text || "[Ses metne dönüştürülemedi]";
          answerMap.set(qid, { text, duration: rec.duration });
        } catch (e) {
          const prev = answerMap.get(qid);
          answerMap.set(qid, { text: "[Ses metne dönüştürülemedi]", duration: rec.duration || prev?.duration || 0 });
        }
      }

      const parts = testData.sections.map((s) => {
        const p: any = { description: s.description, image: "" };
        if (s.subParts?.length) {
          const subParts = s.subParts.map((sp) => {
            const questions = sp.questions.map((q) => {
              const a = answerMap.get(q.id);
              return { questionId: q.id, userAnswer: a?.text ?? "[Cevap bulunamadı]", duration: a?.duration ?? 0 };
            });
            const duration = questions.reduce((acc, q) => acc + (q.duration || 0), 0);
            return { image: sp.images?.[0] || "", duration, questions };
          });
          const duration = subParts.reduce((acc, sp) => acc + (sp.duration || 0), 0);
          p.subParts = subParts;
          p.duration = duration;
        } else {
          const questions = s.questions.map((q) => {
            const a = answerMap.get(q.id);
            return { questionId: q.id, userAnswer: a?.text ?? "[Cevap bulunamadı]", duration: a?.duration ?? 0 };
          });
          const duration = questions.reduce((acc, q) => acc + (q.duration || 0), 0);
          p.questions = questions;
          p.duration = duration;
          if (s.type === "PART3") p.type = "DISADVANTAGE";
        }
        return p;
      });

      await axiosPrivate.post("/api/speaking-submission", { speakingTestId: testData.id, parts });
      toast.success("Test başarıyla gönderildi!");
      navigate("/test");
    } catch (e) {
      console.error("submit error", e);
      toast.error("Test gönderilirken hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // UI helpers
  const Progress = ({ value }: { value: number }) => (
    <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-red-500 to-pink-500"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );

  const Waveform = ({ active }: { active: boolean }) => (
    <div className="flex items-end justify-center gap-1 h-10">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-red-500/80"
          initial={{ height: 6, opacity: 0.6 }}
          animate={active ? { height: [6, 28, 10, 22, 8, 24, 12][i % 7], opacity: [0.6, 1, 0.8] } : { height: 6, opacity: 0.5 }}
          transition={{ repeat: active ? Infinity : 0, duration: 0.8, delay: i * 0.03, ease: "easeInOut" }}
        />
      ))}
    </div>
  );

  // Render states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-rose-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 bg-red-600/90 rounded-2xl mx-auto mb-4 grid place-items-center shadow-xl shadow-red-200">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl text-black font-semibold">Test yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-black">Test bulunamadı</p>
          <button onClick={() => navigate("/test")} className="mt-4 bg-red-600 text-white px-6 py-3 rounded-xl shadow hover:shadow-md transition">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (isTestComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-rose-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full text-center bg-white/70 backdrop-blur border border-red-100 rounded-2xl p-8 shadow-xl">
          <div className="w-20 h-20 bg-red-600 rounded-2xl grid place-items-center mx-auto mb-6 shadow-lg shadow-red-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-black mb-2">Test Tamamlandı!</h1>
          <p className="text-gray-600 mb-6">{recordings.size} soru cevaplanmıştır.</p>
          <div className="space-y-3">
            <button onClick={submitTest} disabled={isSubmitting} className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 px-6 text-lg rounded-xl hover:opacity-95 disabled:opacity-50 shadow">
              {isSubmitting ? "Gönderiliyor..." : "Testi Gönder"}
            </button>
            <button onClick={() => navigate("/test")} className="w-full border-2 border-red-600 text-red-600 font-bold py-4 px-6 text-lg rounded-xl hover:bg-red-600 hover:text-white transition">
              Test Sayfasına Dön
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showSectionDescription && currentSection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-rose-50">
        {!micChecked ? (
          <MicrophoneCheck onSuccess={() => setMicChecked(true)} />
        ) : (
          <>
            <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-red-100">
              <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => navigate("/test")} className="flex items-center text-red-600 hover:text-red-700">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="text-lg font-bold">Geri</span>
                  </button>
                  <h1 className="text-2xl font-extrabold text-black">{testData.title}</h1>
                  <div className="text-lg text-black">Bölüm {currentSectionIndex + 1} / {testData.sections.length}</div>
                </div>
              </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 backdrop-blur border border-red-100 rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-full text-lg font-bold mb-4 shadow">
                    <Info className="w-5 h-5 mr-2" />
                    {currentSection.title}
                  </div>
                  <h2 className="text-3xl font-extrabold text-black mb-4">Bölüm Açıklaması</h2>
                  <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line max-w-3xl mx-auto">
                    {currentSection.description}
                  </p>
                </div>
                <div className="mt-8 text-center">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={startSection} className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-extrabold py-4 px-8 text-xl rounded-xl hover:opacity-95 shadow-lg shadow-red-200">
                    Bölümü Başlat
                  </motion.button>
                </div>
              </motion.div>
            </main>
          </>
        )}
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto grid place-items-center shadow">
            <span className="text-white text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-black">Soru Bulunamadı</h2>
          <p className="text-gray-600">Bölüm {currentSectionIndex + 1}, Alt Bölüm {currentSubPartIndex + 1}, Soru {currentQuestionIndex + 1}</p>
          <button onClick={nextQuestion} className="bg-red-600 text-white px-6 py-3 rounded-xl hover:opacity-95 shadow">Sonraki Soruya Geç</button>
        </div>
      </div>
    );
  }

  // Question Screen
  const totalQuestionsInSection = currentSection.subParts?.length
    ? currentSection.subParts[currentSubPartIndex]?.questions?.length ?? 0
    : currentSection.questions?.length ?? 0;
  const progressPercent = ((currentQuestionIndex) / Math.max(1, totalQuestionsInSection)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-rose-50">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-red-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/test")} className="flex items-center text-red-600 hover:text-red-700">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-lg font-bold">Geri</span>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-black">{testData.title}</h1>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold shadow">
                  {currentSection?.title}
                </div>
                <span className="text-sm text-gray-600">•</span>
                <span className="text-sm text-gray-600">Soru {currentQuestionIndex + 1}</span>
              </div>
            </div>
            <div className="text-lg font-bold text-black">Bölüm {currentSectionIndex + 1} / {testData.sections.length}</div>
          </div>
          <div className="mt-3">
            <Progress value={progressPercent} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSectionIndex}-${currentSubPartIndex}-${currentQuestionIndex}`}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white/80 backdrop-blur border border-red-100 rounded-2xl p-8 shadow-xl"
          >
            {currentSection?.subParts?.[currentSubPartIndex]?.images?.length ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
                <img
                  src={currentSection.subParts[currentSubPartIndex].images[0]}
                  alt="Test görseli"
                  className="max-w-md mx-auto rounded-xl shadow-lg"
                />
              </motion.div>
            ) : null}

            <div className="text-center">
              <motion.h2 initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-extrabold text-black leading-relaxed">
                {currentQuestion.questionText}
              </motion.h2>
            </div>

            {/* Recording Controls */}
            <div className="mt-8 flex flex-col items-center gap-6">
              <Waveform active={isRecording && !isPaused} />

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <motion.button whileTap={{ scale: 0.96 }} onClick={startRecording} disabled={isPlayingInstructions} className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl text-lg font-extrabold hover:opacity-95 disabled:opacity-50 shadow-lg">
                    <Mic className="w-5 h-5" /> Kaydı Başlat
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-3">
                    {!isPaused ? (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={pauseRecording} className="flex items-center gap-2 bg-white border-2 border-red-600 text-red-600 px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-red-50">
                        <Pause className="w-5 h-5" /> Durdur
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={resumeRecording} className="flex items-center gap-2 bg-white border-2 border-green-600 text-green-700 px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-green-50">
                        <Play className="w-5 h-5" /> Devam Et
                      </motion.button>
                    )}
                    <motion.button whileTap={{ scale: 0.96 }} onClick={stopRecording} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl font-bold shadow-sm hover:opacity-95">
                      <Square className="w-5 h-5" /> Bitir
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="bg-gradient-to-br from-red-600 to-pink-600 text-white rounded-xl p-4 text-center shadow">
                  <Clock className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-bold tracking-wide">Kalan Süre</div>
                  <div className="text-2xl font-extrabold">{formatTime(timeLeft)}</div>
                </div>
                <div className="bg-white border-2 border-red-100 rounded-xl p-4 text-center shadow-sm">
                  <div className="w-6 h-6 mx-auto mb-1 bg-red-600 rounded-full" />
                  <div className="text-sm font-bold text-black">Kayıt Süresi</div>
                  <div className="text-2xl font-extrabold text-red-600">{formatTime(recordingTime)}</div>
                </div>
                <div className="bg-white border-2 border-red-100 rounded-xl p-4 text-center shadow-sm">
                  <div className="w-6 h-6 mx-auto mb-1">
                    {isRecording ? (
                      <div className="w-6 h-6 bg-red-600 rounded-full animate-pulse" />
                    ) : recordings.has(currentQuestion.id) ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <div className="w-6 h-6 border-2 border-red-600 rounded-full" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-black">Durum</div>
                  <div className="text-lg font-extrabold">
                    {isPlayingInstructions ? (
                      <span className="text-blue-600">TALİMAT</span>
                    ) : isRecording ? (
                      <span className="text-red-600">KAYIT</span>
                    ) : recordings.has(currentQuestion.id) ? (
                      <span className="text-green-600">TAMAM</span>
                    ) : (
                      <span className="text-black">HAZIR</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary CTA / Instruction state */}
              {isPlayingInstructions && (
                <div className="text-center">
                  <div className="text-5xl">🔊</div>
                  <p className="mt-2 text-gray-600 font-semibold">Talimat dinleniyor...</p>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="mt-8 flex justify-between items-center">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsTestComplete(true)} className="px-4 py-2 text-sm bg-white border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                Test Bitir (Debug)
              </motion.button>

              <div className="text-center">
                {recordings.has(currentQuestion.id) && (
                  <div className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-extrabold shadow">✓ Cevaplandı</div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={nextQuestion}
                disabled={isRecording || isPlayingInstructions}
                className={`px-6 py-3 text-lg font-extrabold rounded-xl shadow ${
                  isRecording || isPlayingInstructions
                    ? "bg-red-600 text-white opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-pink-600 text-white hover:opacity-95"
                }`}
              >
                Sonraki →
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
