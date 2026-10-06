export interface YouTubePlayer {
  playVideo(): void; pauseVideo(): void; seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getDuration(): number; getPlayerState(): number;
  setVolume(volume: number): void; getVolume(): number; mute(): void; unMute(): void; isMuted(): boolean;
  setPlaybackRate(rate: number): void; getPlaybackRate(): number; getAvailablePlaybackRates(): number[];
  getIframe(): HTMLIFrameElement; destroy(): void;
}
interface YouTubeApi {
  Player: new (element: HTMLElement, options: {
    host: string; videoId: string; width: string; height: string;
    playerVars: Record<string, number | string>;
    events: { onReady: (event: { target: YouTubePlayer }) => void; onStateChange: (event: { data: number }) => void; onError: (event: { data: number }) => void; onPlaybackRateChange: (event: { data: number }) => void };
  }) => YouTubePlayer;
}
let apiPromise: Promise<YouTubeApi> | undefined;

// Shared lazy loader. Do not overwrite another embed's global ready callback.
export function loadYouTubeApi(): Promise<YouTubeApi> {
  const getApi = () => (window as Window & { YT?: YouTubeApi }).YT;
  if (getApi()?.Player) return Promise.resolve(getApi()!);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const script = existing ?? document.createElement('script');
    const stop = () => { window.clearInterval(interval); window.clearTimeout(timeout); script.removeEventListener('error', fail); };
    const fail = () => { stop(); if (!existing) script.remove(); apiPromise = undefined; reject(new Error('Video bağlantısı kurulamadı.')); };
    const interval = window.setInterval(() => { const api = getApi(); if (api?.Player) { stop(); resolve(api); } }, 100);
    const timeout = window.setTimeout(fail, 15000);
    script.addEventListener('error', fail, { once: true });
    if (!existing) { script.src = 'https://www.youtube.com/iframe_api'; script.async = true; document.head.append(script); }
  });
  return apiPromise;
}
