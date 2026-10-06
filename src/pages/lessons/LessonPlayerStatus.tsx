type Props = {
  ready: boolean;
  error?: string;
  viewError?: string;
  sourceUrl?: string;
  onRetry: () => void;
};

export default function LessonPlayerStatus({ ready, error, viewError, sourceUrl, onRetry }: Props) {
  if (error) return <div className="lesson-player-status lesson-player-error" role="alert">
    <p>{error}</p>
    <div className="lesson-player-error-actions">
      <button type="button" onClick={onRetry}>Tekrar dene</button>
      {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Kaynakta aç</a> : null}
    </div>
  </div>;
  if (viewError) return <p className="lesson-player-status" role="alert">{viewError}</p>;
  return !ready ? <p className="lesson-player-status" role="status">Video yükleniyor…</p> : null;
}
