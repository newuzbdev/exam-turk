import { useCallback, useEffect, useRef, useState } from "react";
import { overallTestService } from "@/services/overallTest.service";

type LoadedSegment = {
  key: string;
  url: string;
  startMs: number;
  endMs: number;
};

export const useEvidenceSegmentPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedRef = useRef<LoadedSegment | null>(null);
  const timeUpdateRef = useRef<(() => void) | null>(null);
  const [loadingQuestionId, setLoadingQuestionId] = useState<string | null>(null);
  const [playingQuestionId, setPlayingQuestionId] = useState<string | null>(null);
  const [errorQuestionId, setErrorQuestionId] = useState<string | null>(null);
  const [readyQuestionId, setReadyQuestionId] = useState<string | null>(null);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      if (timeUpdateRef.current) {
        audio.removeEventListener("timeupdate", timeUpdateRef.current);
      }
    }
    timeUpdateRef.current = null;
    setPlayingQuestionId(null);
  }, []);

  const dispose = useCallback(() => {
    stop();
    if (loadedRef.current?.url) URL.revokeObjectURL(loadedRef.current.url);
    loadedRef.current = null;
    audioRef.current = null;
    setReadyQuestionId(null);
  }, [stop]);

  useEffect(() => dispose, [dispose]);

  const play = async (resultId: string, questionId: string) => {
    const key = `${resultId}:${questionId}`;
    setErrorQuestionId(null);

    try {
      let loaded = loadedRef.current;
      if (!loaded || loaded.key !== key) {
        dispose();
        setLoadingQuestionId(questionId);
        const metadata = await overallTestService.getListeningEvidenceAudio(
          resultId,
          questionId,
        );
        const blob = await overallTestService.getListeningEvidenceAudioBlob(
          resultId,
          questionId,
        );
        loaded = {
          key,
          url: URL.createObjectURL(blob),
          startMs: metadata.startMs,
          endMs: metadata.endMs,
        };
        loadedRef.current = loaded;
        const audio = document.createElement("audio");
        audio.src = loaded.url;
        audio.preload = "metadata";
        audioRef.current = audio;
      }

      const audio = audioRef.current;
      if (!audio || !loaded) return;
      if (audio.readyState < audio.HAVE_METADATA) {
        await new Promise<void>((resolve, reject) => {
          audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
          audio.addEventListener("error", () => reject(new Error("AUDIO_LOAD_FAILED")), {
            once: true,
          });
          audio.load();
        });
      }
      audio.currentTime = loaded.startMs / 1000;
      const startMs = loaded.startMs;
      const endMs = loaded.endMs;
      const stopAtEnd = () => {
        if (audio.currentTime * 1000 >= endMs) {
          audio.pause();
          audio.currentTime = startMs / 1000;
          audio.removeEventListener("timeupdate", stopAtEnd);
          timeUpdateRef.current = null;
          setPlayingQuestionId(null);
        }
      };
      timeUpdateRef.current = stopAtEnd;
      audio.addEventListener("timeupdate", stopAtEnd);
      audio.onended = () => setPlayingQuestionId(null);
      await audio.play();
      setReadyQuestionId(null);
      setPlayingQuestionId(questionId);
    } catch (error) {
      setPlayingQuestionId(null);
      if (
        error instanceof Error &&
        error.name === "NotAllowedError" &&
        loadedRef.current?.key === key
      ) {
        setReadyQuestionId(questionId);
        setErrorQuestionId(null);
      } else {
        setErrorQuestionId(questionId);
      }
    } finally {
      setLoadingQuestionId(null);
    }
  };

  return {
    play,
    stop,
    loadingQuestionId,
    playingQuestionId,
    errorQuestionId,
    readyQuestionId,
  };
};
