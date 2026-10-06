type Report = { kind: string; sectionLabels: string[] };
export type ReportFilter = 'all' | 'full' | 'listening' | 'reading' | 'writing' | 'speaking';
export const reportFilters: {key: ReportFilter; label: string}[] = [
  {key:'all', label:'Tümü'}, {key:'full', label:'Tam deneme'},
  {key:'listening', label:'Dinleme'}, {key:'reading', label:'Okuma'},
  {key:'writing', label:'Yazma'}, {key:'speaking', label:'Konuşma'},
];
export function selectReports<T extends Report>(reports: T[], filter: ReportFilter, limit: number) {
  const label = reportFilters.find(item => item.key === filter)?.label;
  const matches = reports.filter(item => filter === 'all' || (filter === 'full'
    ? item.kind === 'Tam deneme' : item.sectionLabels.includes(label ?? '')));
  return {items: matches.slice(0, limit), total: matches.length};
}
export const reportTitle = (report: Report) => report.kind === 'Tam deneme'
  ? 'Tam deneme' : report.sectionLabels.join(' · ') || 'Bölüm testi';
