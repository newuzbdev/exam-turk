# TurkishMock öğrenci uygulaması

React 19 + TypeScript + Vite; bu klasör bağımsız Git deposudur.

- Ortak çalışma kuralları: [backend/AGENTS.md](../backend/AGENTS.md).
- Büyük görev/yeni oturum: [proje hafızası](../backend/docs/project/README.md).
- Mimari: [ARCHITECTURE](../backend/docs/project/ARCHITECTURE.md).
- Durum/kararlar: [CURRENT_STATE](../backend/docs/project/CURRENT_STATE.md), [DECISIONS](../backend/docs/project/DECISIONS.md).
- Kod kalıpları: [CONVENTIONS](../backend/docs/project/CONVENTIONS.md).
- Ürün: [PRODUCT](../backend/docs/project/PRODUCT.md).

Context daraldığında veya yeni görev açıldığında önemli bilgileri konuşmadan
tahmin etmeyin; bu haritayı ve yalnız ilgili belgeleri tekrar okuyun.
Tek başına clone/worktree'de `../backend` bulunmayabilir. Geçerli backend checkout'unu
bulun; yoksa backend ile ilgili varsayımdan önce kullanıcıya eksik kaynağı söyleyin.

Yerel başlatma: `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.
Build: `npm run build`; typecheck: `npx tsc -b`; lint: `npm run lint`.
Testler `test/*.test.mjs`; örnek: `node --test test/dashboard-home-render.test.mjs`.
`npm test` script'i yoktur. Varsayılan Vite portu 3001, backend ile çakışabilir.
`VITE_API_URL` origin'dir; servisler `/api` ekler. `VITE_ADMIN_APP_URL` editör origin'idir.
Router `src/routes/routes.tsx` içinde açıkça tanımlıdır; dosya tabanlı routing değildir.
Auth girişi `src/contexts/AuthContext.tsx`; sırf Cookie adlı dosya var diye HttpOnly varsaymayın.
Sonuç/sınav tasarım dili korunur; dashboard el çizimi denemesi geri alınmıştır.
İlgisiz dirty değişiklikleri koruyun; yeni dependency, puanlama ve sözleşme değişikliği yapmayın.
Secret'ı frontend'e eklemeyin. Açık istek olmadan commit/push/deploy yapmayın.
Önemli proje bilgisi değişirse ortak belgeleri güncelleyin; küçük UI işinde tüm docs'u yüklemeyin.
