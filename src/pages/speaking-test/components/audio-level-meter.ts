export const AUDIO_METER_SEGMENTS = 16;
export const AUDIO_METER_HISTORY = 28;

/** Relative digital signal level, from -60 dBFS to full scale; not room loudness. */
export function getAudioMeterLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  if (!Number.isFinite(rms) || rms <= 0.001) return 0;
  return Math.min(AUDIO_METER_SEGMENTS, Math.ceil(((20 * Math.log10(rms) + 60) / 60) * AUDIO_METER_SEGMENTS));
}

/** One reusable buffer; sample at most 30 times/second, notify only on level changes. */
export function sampleAudioLevel(
  analyser: AnalyserNode,
  onLevel: ((level: number) => void) | undefined,
  isPlaying: () => boolean = () => true,
  onHistory?: (levels: number[]) => void,
): () => void {
  const samples = new Float32Array(analyser.fftSize);
  const history = new Array<number>(AUDIO_METER_HISTORY).fill(0);
  let frame: number;
  let stopped = false;
  let previousLevel = 0;
  let lastSample = -Infinity;
  const measure = (now: number) => {
    if (stopped) return;
    if (now - lastSample >= 1000 / 30) {
      lastSample = now;
      let level = 0;
      const playing = isPlaying();
      if (playing) {
        analyser.getFloatTimeDomainData(samples);
        level = getAudioMeterLevel(samples);
      }
      if (onHistory && history.some(value => value !== level)) {
        if (playing) {
          history.shift();
          history.push(level);
        } else {
          history.fill(0);
        }
        onHistory([...history]);
      }
      if (level !== previousLevel) {
        previousLevel = level;
        onLevel?.(level);
      }
    }
    frame = requestAnimationFrame(measure);
  };
  frame = requestAnimationFrame(measure);
  return () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    if (previousLevel !== 0) onLevel?.(0);
    if (onHistory && history.some(value => value !== 0)) onHistory(history.fill(0));
  };
}
