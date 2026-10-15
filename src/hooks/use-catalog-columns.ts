import { useEffect, useState } from 'react';

export const ROWS_PER_PAGE = 10;

// Keep these thresholds aligned with the card grid's sm/lg column classes.
function readCatalogColumns() {
  if (typeof window === 'undefined') return 1;
  return window.matchMedia('(min-width: 1024px)').matches ? 3
    : window.matchMedia('(min-width: 640px)').matches ? 2 : 1;
}

export function useCatalogColumns() {
  const [columns, setColumns] = useState(readCatalogColumns);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const medium = window.matchMedia('(min-width: 640px)');
    const update = () => setColumns(wide.matches ? 3 : medium.matches ? 2 : 1);
    wide.addEventListener('change', update);
    medium.addEventListener('change', update);
    update();
    return () => {
      wide.removeEventListener('change', update);
      medium.removeEventListener('change', update);
    };
  }, []);
  return columns;
}
