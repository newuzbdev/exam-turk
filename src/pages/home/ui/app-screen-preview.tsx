type AppScreenPreviewProps = {
  src: string;
};

export default function AppScreenPreview({ src }: AppScreenPreviewProps) {
  return (
    <figure className="mx-auto mb-10 mt-4 w-full max-w-[820px] overflow-hidden rounded-xl border border-[var(--tm-border-default)] bg-white shadow-[0_12px_40px_-20px_rgba(0,0,0,0.16)] sm:mb-14 sm:mt-8 lg:w-[74%]">
      <div aria-hidden="true" className="flex h-9 items-center gap-1.5 border-b border-[var(--tm-border-default)] bg-neutral-50 px-4 sm:h-10">
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="mx-auto pr-8 text-xs text-neutral-500">TurkishMock · Öğrenci paneli</span>
      </div>
      <img src={src} alt="TurkishMock Dashboard: seviye özeti, dört becerinin puanları ve çalışma ritmi" width={1187} height={854} className="block h-auto w-full" loading="lazy" decoding="async" />
    </figure>
  );
}
