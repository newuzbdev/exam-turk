import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { readAccessOwner, useAccessLink } from '@/hooks/use-access-link';
import { type AccessTarget } from '@/services/access.service';
import { readingPracticeService } from '@/services/readingPractice.service';
import listeningPracticeService from '@/services/listeningPractice.service';
import writingPracticeService from '@/services/writingPractice.service';
import speakingPracticeService from '@/services/speakingPractice.service';
import { Button } from '@/components/ui/button';
import PracticeAssessmentNotice from './PracticeAssessmentNotice';
import { publishCurrentActivity, saveOwnedAccess } from '@/utils/access-link-context';

const routeSegments = { reading: 'okuma', listening: 'dinleme', writing: 'yazma', speaking: 'konusma' } as const;
type Skill = keyof typeof routeSegments;
export default function PracticeDirectEntry({ skill, id, hasActiveMembership, membershipPending }: { skill: Skill; id: string; hasActiveMembership: boolean; membershipPending: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const target: AccessTarget = { scope: `PRACTICE_${skill.toUpperCase()}` as AccessTarget['scope'], targetId: id };
  const access = useAccessLink(target);
  const [preview, setPreview] = useState<{ title: string; isFreeAccess?: boolean } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (!access.entry || access.loading || access.error) return;
    let active = true;
    setPreview(null);
    setPreviewError('');
    const request = skill === 'reading' ? readingPracticeService.getPreview(id) : { listening: listeningPracticeService, writing: writingPracticeService, speaking: speakingPracticeService }[skill].list().then(rows => rows.find(row => row.id === id) || null);
    void request.then(value => { if (active) { setPreview(value); if (!value) setPreviewError('Bu pratik bulunamadı.'); } }).catch(() => { if (active) setPreviewError('Pratik bilgisi şu anda yüklenemedi.'); });
    return () => { active = false; };
  }, [skill, id, access.entry, access.loading, access.error]);
  const canOpen = access.entry?.enabled ? access.entry.decision?.canOpen : preview?.isFreeAccess || hasActiveMembership;
  const start = async () => {
    if (!canOpen || starting || !preview) return;
    if (access.entry?.enabled && access.entry.ownerId !== readAccessOwner()) {
      setPreviewError('Hesabınız değişti. Bağlantıyı yeniden açın.');
      return;
    }
    setStarting(true);
    try {
      if (skill !== 'reading') {
        navigate(`/app/pratik/${routeSegments[skill]}/${encodeURIComponent(id)}`);
        return;
      }
      // Reopening a link keeps the existing attempt and its draft/timer choice.
      let saved: { attemptId?: string; ownerId?: string; timerEnabled?: boolean; timerMinutes?: number } | null = null;
      try { saved = JSON.parse(localStorage.getItem(`reading-practice-progress:${id}`) || 'null'); } catch { /* Optional draft. */ }
      let attemptId = saved?.attemptId;
      if (attemptId) {
        if (saved?.ownerId && saved.ownerId !== user?.id) {
          setPreviewError('Taslağınız korunuyor. Bu oturum başka bir hesaba ait; kendi hesabınızla devam edin.');
          return;
        }
        if (!saved?.ownerId) {
          const recovered = await readingPracticeService.getSolveDetail(id, attemptId);
          if (!recovered || !user?.id || readAccessOwner() !== user.id) {
            setPreviewError('Taslağınız korunuyor. Önceki oturum bu hesap için doğrulanamadı. Kendi hesabınızla tekrar deneyin.');
            return;
          }
          // Upgrade ownership metadata only after the authenticated server has confirmed this exact attempt.
          localStorage.setItem(`reading-practice-progress:${id}`, JSON.stringify({ ...saved, ownerId: user.id }));
        }
      } else {
        attemptId = (await readingPracticeService.start(id, { accessContextId: access.entry?.contextId }))?.attemptId;
      }
      if (!attemptId) return;
      if (user?.id && access.entry?.enabled) publishCurrentActivity(user.id, 'READING', { contentId: id, attemptId, target });
      if (user?.id && access.entry?.contextId) saveOwnedAccess(user.id, { ...target, targetId: `${id}:attempt:${attemptId}` }, access.entry);
      const query = new URLSearchParams({ attemptId, mod: 'calisma', sayac: saved?.timerEnabled ? '1' : '0', sure: String(saved?.timerMinutes || 20) });
      navigate(`/app/pratik/okuma/${encodeURIComponent(id)}?${query}`);
    } catch { setPreviewError('Pratik oturumu doğrulanamadı. Taslağınız korunuyor.'); } finally { setStarting(false); }
  };
  return <section className="mt-4 rounded-lg border border-[var(--tm-border-subtle)] bg-white p-6" aria-label="Pratik hazırlığı">
    {access.loading || (!preview && !previewError && !access.error) ? <p role="status">Erişiminiz kontrol ediliyor…</p> : null}
    {access.error ? <p role="alert">{access.error}</p> : previewError ? <p role="alert">{previewError}</p> : preview ? <>
      <h2 className="text-lg font-semibold">{preview.title}</h2>
      <p className="mt-2 text-sm">Hazır olduğunuzda pratiğe başlayabilirsiniz.</p>
      {(skill === 'writing' || skill === 'speaking') && <PracticeAssessmentNotice
        isPublicFree={access.entry?.enabled ? access.entry.decision?.isPublicFree === true : preview.isFreeAccess === true}
        decision={access.entry?.decision}
      />}
      {!canOpen && !(membershipPending && !access.entry?.enabled) ? <p role="alert" className="mt-3">Bu çalışmaya başlamak için önce abone olmanız gerekiyor.</p> : null}
      <Button className="mt-4" disabled={!canOpen || starting || (!access.entry?.enabled && membershipPending)} onClick={() => void start()}>{starting ? 'Hazırlanıyor…' : 'Pratiğe başla / devam et'}</Button>
    </> : null}
    {access.error && !access.invalid ? <Button className="mt-4" onClick={access.retry}>Tekrar dene</Button> : null}
    <Button variant="outline" className="ml-2 mt-4" onClick={() => navigate(`/app/pratik?bolum=${skill}`, { replace: true })}>Kataloğa dön</Button>
  </section>;
}
