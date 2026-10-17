import { useEffect, useRef } from "react";
import { useLocation, useRouteError } from "react-router";
import { isActiveStudentExam, studentPath } from "@/routes/student-route-paths";
import { isModuleLoadError } from "@/utils/moduleLoadError";

type Props = { error: unknown; onReload?: () => void };

export function PageLoadError({ error, onReload = () => window.location.reload() }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();
  const path = studentPath(pathname) ?? pathname;
  const isExam = isActiveStudentExam(path) || /^\/app\/pratik\/(okuma|dinleme|yazma|konusma)\/(?!sonuc(?:\/|$))[^/]+\/?$/.test(path);
  const moduleFailed = isModuleLoadError(error);
  const title = moduleFailed ? "Sayfa yüklenemedi" : "Bir sorun oluştu";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | TurkishMock`;
    heading.current?.focus();
    return () => { document.title = previousTitle; };
  }, [title]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fafaf9] px-6 py-12 text-[#37352f]" lang="tr">
      <div className="w-full max-w-sm">
        <p className="mb-10 text-lg font-extrabold tracking-tight text-[#c43131]">TURKISHMOCK</p>
        <h1 ref={heading} tabIndex={-1} className="mb-3 text-2xl font-semibold tracking-tight [outline:none!important]">{title}</h1>
        <p className="text-base leading-relaxed text-[#6b6963]">
          {moduleFailed
            ? "Sayfa güncellenmiş olabilir. İnternet bağlantınızı kontrol edip sayfayı yenileyin."
            : "Bu sayfa şu anda açılamıyor. Lütfen sayfayı yenileyip tekrar deneyin."}
        </p>
        {isExam && <p className="mt-4 text-sm leading-relaxed text-[#6b6963]">Yenileme sırasında kaydedilmemiş değişiklikler kaybolabilir.</p>}
        <button type="button" onClick={onReload} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-[#37352f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#24231f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#37352f]">
          Sayfayı yenile
        </button>
      </div>
    </main>
  );
}

export function RouteErrorPage() {
  return <PageLoadError error={useRouteError()} />;
}
