import { Button } from '@/components/ui/button';
import { ROWS_PER_PAGE } from '@/hooks/use-catalog-columns';

export default function PracticeLoadMore({
  hasMore, remainingItems, columns, onLoadMore, loading = false, error = false,
}: {
  hasMore: boolean;
  remainingItems: number;
  columns: number;
  onLoadMore: () => void;
  loading?: boolean;
  error?: boolean;
}) {
  if (!hasMore && !error) return null;
  const rows = Math.min(ROWS_PER_PAGE, Math.max(1, Math.ceil(remainingItems / columns)));
  return (
    <div className="mt-7 flex flex-col items-center gap-3 pb-2">
      {error && <p role="alert" className="text-sm text-[var(--tm-text-secondary)]">Sonraki pratikler yüklenemedi. Yeniden deneyin.</p>}
      {hasMore && <Button
        type="button"
        variant="outline"
        disabled={loading}
        aria-busy={loading || undefined}
        className="min-h-11 w-full border-[var(--tm-border-subtle)] bg-white px-6 text-sm font-semibold text-[var(--tm-text-primary)] hover:bg-[var(--tm-bg-hover)] sm:w-auto"
        onClick={onLoadMore}
      >
        {loading ? 'Yükleniyor...' : error ? 'Tekrar dene' : `${rows} sıra daha göster`}
      </Button>}
    </div>
  );
}
