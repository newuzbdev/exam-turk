import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { Check, GripVertical, Maximize, Minimize, Monitor, PanelTop, Pause, PictureInPicture2, Play, RectangleHorizontal, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { clampMediaTime, formatMediaTime, type LessonVideoSource } from './lesson-catalog';
import { loadYouTubeApi, type YouTubePlayer } from './lesson-youtube';
import { initialLessonPlayerView, lessonPlayerViewReducer, type LessonPlayerLayout } from './lesson-player-view';
import LessonPlayerStatus from './LessonPlayerStatus';
import { useMiniPlayerDrag } from './use-mini-player-drag';

const viewOptions = [
  { value: 'small', label: 'Küçük', icon: RectangleHorizontal },
  { value: 'wide', label: 'Geniş', icon: Monitor },
  { value: 'fullscreen', label: 'Tam ekran', icon: Maximize },
  { value: 'mini', label: 'Mini', icon: PictureInPicture2 },
] as const;

export default function MinimalLessonPlayer({ source, title }: { source: LessonVideoSource; title: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLVideoElement>(null);
  const youtube = useRef<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rates, setRates] = useState([1]);
  const [view, dispatchView] = useReducer(lessonPlayerViewReducer, initialLessonPlayerView);
  const miniDrag = useMiniPlayerDrag(wrapper, view.layout === 'mini' && !view.fullscreen);
  const [error, setError] = useState('');
  const [viewError, setViewError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const youtubeId = source.kind === 'youtube' ? source.id : null;

  useEffect(() => {
    const update = () => dispatchView({ type: 'fullscreen', active: document.fullscreenElement === wrapper.current });
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    if (!youtubeId || !mount.current) return;
    let disposed = false;
    let player: YouTubePlayer | undefined;
    let timer: number | undefined;
    const host = mount.current;
    const child = document.createElement('div');
    host.append(child);
    const watchdog = window.setTimeout(() => {
      if (!disposed) setError('Video yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    }, 22000);
    void loadYouTubeApi().then(api => {
      if (disposed) return;
      player = new api.Player(child, {
        host: 'https://www.youtube-nocookie.com', videoId: youtubeId, width: '100%', height: '100%',
        playerVars: { controls: 0, playsinline: 1, rel: 0, hl: 'tr', origin: window.location.origin, autoplay: 0 },
        events: {
          onReady: ({ target }) => {
            if (disposed) return;
            window.clearTimeout(watchdog);
            youtube.current = target;
            target.getIframe().title = title;
            setReady(true);
            setError('');
            setDuration(target.getDuration());
            setRates(target.getAvailablePlaybackRates().length ? target.getAvailablePlaybackRates() : [1]);
            timer = window.setInterval(() => {
              if (disposed) return;
              setPosition(target.getCurrentTime());
              setDuration(target.getDuration());
              setVolume(target.getVolume());
              setMuted(target.isMuted());
            }, 300);
          },
          onStateChange: ({ data }) => { if (!disposed) setPlaying(data === 1); },
          onPlaybackRateChange: ({ data }) => { if (!disposed) setSpeed(data); },
          onError: () => {
            window.clearTimeout(watchdog);
            if (!disposed) { setPlaying(false); setReady(false); setError('Bu video burada oynatılamıyor. Tekrar deneyebilir veya kaynakta açabilirsiniz.'); }
          },
        },
      });
    }).catch(() => {
      window.clearTimeout(watchdog);
      if (!disposed) setError('Video bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    });
    return () => {
      disposed = true;
      window.clearTimeout(watchdog);
      window.clearInterval(timer);
      youtube.current = null;
      player?.destroy();
      host.replaceChildren();
    };
  }, [youtubeId, title, attempt]);

  const retryMedia = () => {
    setError('');
    setReady(false);
    setPlaying(false);
    setPosition(0);
    setDuration(0);
    setSpeed(1);
    setRates([1]);
    setAttempt(value => value + 1);
    wrapper.current?.focus();
  };

  const toggle = () => {
    if (!ready) return;
    if (youtube.current) { if (playing) youtube.current.pauseVideo(); else youtube.current.playVideo(); }
    else if (file.current) {
      if (playing) file.current.pause();
      else void file.current.play().catch(() => setError('Video başlatılamadı. Lütfen tekrar oynatmayı deneyin.'));
    }
  };
  const seek = (value: number) => {
    const next = clampMediaTime(value, duration);
    if (youtube.current) youtube.current.seekTo(next, true);
    else if (file.current) file.current.currentTime = next;
    setPosition(next);
  };
  const changeVolume = (value: number) => {
    if (youtube.current) { youtube.current.setVolume(value); youtube.current.unMute(); }
    else if (file.current) { file.current.volume = value / 100; file.current.muted = false; }
    setVolume(value); setMuted(false);
  };
  const toggleMute = () => {
    if (youtube.current) { if (muted) youtube.current.unMute(); else youtube.current.mute(); }
    else if (file.current) file.current.muted = !muted;
    setMuted(!muted);
  };
  const changeSpeed = (value: number) => {
    if (youtube.current) youtube.current.setPlaybackRate(value);
    else if (file.current) file.current.playbackRate = value;
    setSpeed(value);
  };
  const selectView = async (next: LessonPlayerLayout | 'fullscreen') => {
    miniDrag.cancel();
    setViewError('');
    try {
      if (next === 'fullscreen') {
        if (document.fullscreenElement !== wrapper.current) {
          if (!wrapper.current?.requestFullscreen) throw new Error('Fullscreen unavailable');
          await wrapper.current.requestFullscreen();
        }
      } else {
        if (document.fullscreenElement === wrapper.current) await document.exitFullscreen();
        dispatchView({ type: 'select', layout: next });
      }
    } catch {
      setViewError('Görünüm değiştirilemedi. Bu tarayıcı tam ekranı desteklemiyor olabilir.');
    }
  };
  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('[role="menu"]')) return;
    if (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'BUTTON', 'A'].includes(event.target.tagName)) return;
    if (event.key === ' ' || event.key.toLowerCase() === 'k') { event.preventDefault(); toggle(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(position - 10); }
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(position + 10); }
  };

  return <div className="lesson-player-slot" data-view={view.layout}>
    <div ref={wrapper} className="lesson-player" onKeyDown={handleKeys} tabIndex={0} role="region" aria-label="Ders videosu" data-fullscreen={view.fullscreen}
      data-mini-corner={miniDrag.corner} data-dragging={miniDrag.dragging} style={miniDrag.style}>
    <div className="lesson-player-mini-heading">
      <button type="button" className="lesson-player-drag-handle" {...miniDrag.handleProps}
        aria-label="Mini oynatıcıyı taşı" title="Başlıktan tutup sürükleyin veya ok tuşlarıyla köşeyi değiştirin.">
        <GripVertical size={14} aria-hidden="true" /><span>{title}</span>
      </button>
      <button type="button" className="lesson-player-button" onClick={() => dispatchView({ type: 'restore' })} aria-label="Videoyu sayfaya geri al" title="Sayfaya geri al"><PanelTop size={17} /></button>
    </div>
    <div className="lesson-player-media">
      {source.kind === 'youtube' ? <div ref={mount} className="lesson-youtube-host" /> : <video key={attempt} ref={file} src={source.url} playsInline preload="metadata" aria-label={title}
        onLoadedMetadata={() => { setDuration(file.current?.duration ?? 0); setReady(true); setError(''); setRates([0.5, 0.75, 1, 1.25, 1.5, 2]); }}
        onTimeUpdate={() => setPosition(file.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onError={() => { setReady(false); setError('Video yüklenemedi. Lütfen bağlantınızı kontrol edin.'); }} />}
    </div>
    <div className="lesson-player-controls">
      <input className="lesson-player-timeline" type="range" min="0" max={duration || 1} step="0.1" value={clampMediaTime(position, duration)} onChange={event => seek(Number(event.target.value))} disabled={!ready || duration <= 0} aria-label="Video zaman çizelgesi" aria-valuetext={`${formatMediaTime(position)} / ${formatMediaTime(duration)}`} />
      <div className="lesson-player-toolbar">
        <button type="button" className="lesson-player-button" disabled={!ready} onClick={toggle} aria-label={playing ? 'Duraklat' : 'Oynat'} title={playing ? 'Duraklat' : 'Oynat'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button type="button" className="lesson-player-button" disabled={!ready || !duration} onClick={() => seek(position - 10)} aria-label="10 saniye geri" title="10 saniye geri"><RotateCcw size={17} /></button>
        <button type="button" className="lesson-player-button" disabled={!ready || !duration} onClick={() => seek(position + 10)} aria-label="10 saniye ileri" title="10 saniye ileri"><RotateCw size={17} /></button>
        <button type="button" className="lesson-player-button" disabled={!ready} onClick={toggleMute} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} title={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <input className="lesson-player-volume" type="range" min="0" max="100" value={muted ? 0 : volume} onChange={event => changeVolume(Number(event.target.value))} disabled={!ready} aria-label="Ses düzeyi" />
        <span className="lesson-player-time">{formatMediaTime(position)} / {formatMediaTime(duration)}</span>
        <span className="flex-1" />
        <select className="lesson-player-speed" value={speed} onChange={event => changeSpeed(Number(event.target.value))} disabled={!ready || rates.length < 2} aria-label="Oynatma hızı">{rates.map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select>
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="lesson-player-button" aria-label="Video görünümü" title="Video görünümü"><Monitor size={18} /></button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal container={view.fullscreen ? wrapper.current : undefined}>
          <DropdownMenu.Content className="lesson-view-menu" side="top" align="end" sideOffset={8} collisionPadding={8}>
            <DropdownMenu.RadioGroup value={view.fullscreen ? 'fullscreen' : view.layout} onValueChange={value => { void selectView(value as LessonPlayerLayout | 'fullscreen'); }} aria-label="Video görünümü">
              {viewOptions.map(({ value, label, icon: Icon }) => <DropdownMenu.RadioItem className="lesson-view-option" key={value} value={value}>
                <Icon size={16} aria-hidden="true" /><span>{label}</span>
                <DropdownMenu.ItemIndicator className="lesson-view-check"><Check size={15} /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>)}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        {view.fullscreen ? <button type="button" className="lesson-player-button" onClick={() => void selectView(view.layout)} aria-label="Tam ekrandan çık" title="Tam ekrandan çık"><Minimize size={18} /></button> : null}
      </div>
    </div>
    <LessonPlayerStatus ready={ready} error={error} viewError={viewError} onRetry={retryMedia}
      sourceUrl={source.kind === 'youtube' ? `https://www.youtube.com/watch?v=${source.id}` : undefined} />
    </div>
    {view.layout === 'mini' ? <div className="lesson-player-placeholder">
      <PictureInPicture2 size={24} strokeWidth={1.5} aria-hidden="true" />
      <p>Video mini oynatıcıda açık.</p>
      <button type="button" onClick={() => dispatchView({ type: 'restore' })}>Videoyu buraya al</button>
    </div> : null}
  </div>;
}
