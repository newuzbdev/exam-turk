import { CalendarDays, Clock3, Flame, Play } from "lucide-react";

import { StudentPageShell } from "@/components/tm";
import "./focus-page.css";

const activityDays = Array.from({ length: 28 }, (_, index) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - (27 - index));

  return {
    key: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
    }).format(date),
  };
});

export default function FocusPage() {
  return (
    <StudentPageShell
      title="Odak"
      description="Türkçe için ayırdığın zamanı gör, çalışma ritmini koru."
      actions={
        <button type="button" className="focus-page__start" onClick={() => window.dispatchEvent(new Event("tm:open-focus"))}>
          <Play className="h-4 w-4" fill="currentColor" /> Yeni oturum
        </button>
      }
    >
      <div className="focus-page">
        <section className="focus-page__panel focus-page__weekly">
            <div className="focus-page__heading">
              <div>
                <h2>Çalışma ritmi</h2>
                <p>Son 4 hafta</p>
              </div>
              <strong>0 çalışma günü</strong>
            </div>
            <div className="focus-page__rhythm" aria-label="Son 4 haftanın çalışma günleri">
              <div className="focus-page__rhythm-body">
                <div className="focus-page__rhythm-weekdays" aria-hidden="true"><span>Pzt</span><span>Çar</span><span>Cum</span><span>Paz</span></div>
                <div className="focus-page__rhythm-grid">
                  {activityDays.map((day) => (
                    <button
                      type="button"
                      key={day.key}
                      data-level={0}
                      aria-label={`${day.label} · kaydedilmiş çalışma yok`}
                      title={`${day.label} · kayıt yok`}
                    />
                  ))}
                </div>
              </div>
              <div className="focus-page__rhythm-footer">
                <span>Tamamlanan odak oturumları</span>
                <div aria-label="Yoğunluk göstergesi"><small>Az</small>{[0,1,2,3,4].map(level => <i key={level} data-level={level} />)}<small>Çok</small></div>
              </div>
            </div>
        </section>

        <section className="focus-page__summary" aria-label="Çalışma özeti">
          <Summary icon={Clock3} label="Bugün" value="0 dk" detail="Kayıt yok" />
          <Summary icon={CalendarDays} label="Bu hafta" value="0 dk" detail="Kayıt yok" />
          <Summary icon={CalendarDays} label="Bu ay" value="0 dk" detail="Kayıt yok" />
          <Summary icon={Flame} label="Çalışma serisi" value="0 gün" detail="Henüz seri yok" />
        </section>

        <section className="focus-page__panel focus-page__history">
          <div className="focus-page__heading">
            <div>
              <h2>Son oturumlar</h2>
              <p>Tamamlanan odak oturumların burada gösterilir.</p>
            </div>
          </div>
          <div className="focus-page__empty">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>Henüz kaydedilmiş odak oturumu yok</strong>
              <p>İlk oturumunu başlattığında çalışma geçmişin burada görünecek.</p>
            </div>
          </div>
        </section>
      </div>
    </StudentPageShell>
  );
}

function Summary({ icon: Icon, label, value, detail }: {
  icon: typeof Clock3;
  label: string;
  value: string;
  detail: string;
}) {
  return <article>
    <span className="focus-page__summary-icon"><Icon className="h-[18px] w-[18px]" strokeWidth={1.9} /></span>
    <p>{label}</p>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>;
}
