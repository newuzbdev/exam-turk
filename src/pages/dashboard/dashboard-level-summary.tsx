import { Info } from 'lucide-react';
import { useRef, type PointerEvent } from 'react';
import { dashboardFullDate, dashboardNumber, type ProgressSkill } from './dashboard-home-data';
import { dashboardAverageNumber, dashboardDeclaredLevel, declaredLevelPosition, pointerTooltipPosition, scorePosition, targetScore } from './dashboard-level-data';
import type { StudentCurrentLevel } from './onboarding-api';

function ScaleMarker({ kind, score, label, description }: {
  kind: 'target' | 'mark'; score: number; label: string; description: string;
}) {
  const position = scorePosition(score);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const followPointer = (event: PointerEvent<HTMLSpanElement>) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const marker = event.currentTarget.getBoundingClientRect();
    const point = pointerTooltipPosition(event.clientX, event.clientY, tooltip.offsetWidth, tooltip.offsetHeight, window.innerWidth, window.innerHeight);
    tooltip.style.left = `${point.left - marker.left}px`;
    tooltip.style.top = `${point.top - marker.top}px`;
    tooltip.style.right = 'auto';
    tooltip.style.bottom = 'auto';
    tooltip.style.transform = 'none';
  };
  return <span className={`dashboard-level__marker dashboard-level__marker--${kind}`}
    role="img" tabIndex={0} aria-label={label}
    onPointerEnter={followPointer} onPointerMove={followPointer}
    onPointerLeave={() => tooltipRef.current?.removeAttribute('style')}
    data-align={position < 15 ? 'start' : position > 85 ? 'end' : 'center'}
    style={{ left: `${position}%` }}>
    <span className={`dashboard-level__${kind}`} aria-hidden="true"/>
    <span ref={tooltipRef} className="dashboard-level__tooltip" aria-hidden="true">{description}</span>
  </span>;
}

export function DashboardLevelSummary({ average, level, skills, target, currentLevel, resultsStatus = 'ready', missingLabel, lowEvidence }: {
  average: number | null;
  level: string | null;
  skills: ProgressSkill[];
  target?: string | null;
  currentLevel?: StudentCurrentLevel | null;
  resultsStatus?: 'ready' | 'loading' | 'error';
  missingLabel: string;
  lowEvidence: boolean;
}) {
  const coverage = skills.filter(skill => skill.average !== null).length;
  const hasStale = skills.some(skill => skill.isStale);
  const declared = average === null ? dashboardDeclaredLevel(currentLevel) : null;
  const displayLevel = average !== null ? level : declared ?? 'Henüz belirlenmedi';

  return <>
    <div className="dashboard-level__heading">
      <div>
        <h2>{average !== null ? 'Tahmini seviyeniz' : 'Başlangıç seviyeniz'}</h2>
        <p className="dashboard-level__value" data-unknown={average === null && !declared || undefined}>
          {displayLevel === 'B1 altı' ? <>B1 <span className="dashboard-level__qualifier">altı</span></> : displayLevel}
        </p>
      </div>
      <div className="dashboard-level__aside">
      {targetScore(target) !== null && <p className="dashboard-level__goal">Hedefiniz <strong>{target}</strong></p>}
      <div className="dashboard-level__explanation">
        {average !== null && level ? <p aria-label={`Ortalama puan: ${dashboardAverageNumber(average)} / 75`}>
          <strong>{dashboardAverageNumber(average)} / 75</strong> ortalama
          {hasStale && <small className="dashboard-stale-label">Eski sonuç içerir</small>}
        </p> : <p>{declared ? 'Anketteki seçiminiz' : resultsStatus === 'ready' ? coverage ? `Genel seviye için ${missingLabel} gerekli.` : 'Henüz test sonucu yok' : null}
          {resultsStatus !== 'ready' && <span className="dashboard-level__result-status" role="status">{resultsStatus === 'loading' ? 'Sonuçlar yükleniyor…' : 'Sonuçlar yüklenemedi.'}</span>}
        </p>}
        <div className="dashboard-level__note">
          <details className="student-home__estimate-note">
            <summary aria-label="Seviye nasıl hesaplanıyor?"><Info size={15}/></summary>
            <div>
              <strong>Seviye nasıl hesaplanıyor?</strong>
              {average === null && <p>Başlangıç seviyesi anketteki seçiminizdir; bir test puanı değildir.</p>}
              <p>Bu bir tahmindir, resmî sınav sonucu değildir.</p>
              <p>Her bölümün son 60 gündeki en yeni 3 testi alınır. 1 veya 2 test varsa yalnız bunlar kullanılır.</p>
              <p>Dört bölüm eşit ağırlıktadır. Eksik bölüm varsa genel seviye gösterilmez.</p>
              <p>Son 60 günde test yoksa önceki tahmin “Eski sonuç” olarak kalır. Yeni testle birlikte eski puanlar ortalamadan çıkar.</p>
              <p>Siyah çizgi ortalamanız, kesik çizgi hedefiniz, renkli noktalar bölüm ortalamalarıdır.</p>
              <p>Ok, yeni testin ortalamanızı ne kadar değiştirdiğini gösterir. İki hesapta da aynı 60 günlük dönem kullanılır.</p>
              <p>Puanlar ekranda yuvarlanır; hesap ve seviye değişmez. Yuvarlama seviye sınırını aşarsa ondalık gösterilir.</p>
              {lowEvidence && <p>Bazı bölümlerde 3 testten az sonuç var.</p>}
              {skills.some(skill => skill.sampleCount > 0) && <details className="dashboard-sample-details">
                <summary aria-label="Hesapta kullanılan test tarihleri">Test tarihleri</summary>
                <ul className="dashboard-sample-info">{skills.filter(skill => skill.sampleCount > 0).map(skill => <li key={skill.key}>
                <strong>{skill.label}:</strong> {skill.sampleCount} test · {dashboardFullDate(skill.sample[skill.sample.length - 1].timestamp)}
                {skill.sampleCount > 1 && ` – ${dashboardFullDate(skill.sample[0].timestamp)}`}
                {skill.isStale && ' · Eski sonuç'}
                </li>)}</ul>
              </details>}
            </div>
          </details>
        </div>
      </div>
      </div>
    </div>
    <DashboardLevelScale average={average} skills={skills} target={target} currentLevel={currentLevel} />
  </>;
}


export function DashboardLevelScale({ average, skills, target, currentLevel }: {
  average: number | null;
  skills: Pick<ProgressSkill, 'key' | 'label' | 'average' | 'isStale'>[];
  target?: string | null;
  currentLevel?: StudentCurrentLevel | null;
}) {
  const goal = targetScore(target);
  const hasStale = skills.some(skill => skill.isStale);
  const declared = average === null ? dashboardDeclaredLevel(currentLevel) : null;
  return (
    <div className="dashboard-level__scale" role="group" aria-label="Seviye ve hedef göstergesi">
      <div className="dashboard-level__bands" aria-hidden="true">
        {['B1 altı', 'B1', 'B2', 'C1'].map(name => <div className="dashboard-level__band" key={name} data-declared={name === declared || undefined}><span>{name}</span></div>)}
      </div>
      {goal !== null && <ScaleMarker kind="target" score={goal} label={`Hedef ${target}: ${goal} / 75`} description={`Hedef ${target} · ${goal} / 75`}/>}
      {declared && <span className="dashboard-level__marker dashboard-level__marker--declared" role="img" tabIndex={0}
        aria-label={`Seçtiğiniz seviye: ${declared}`} data-align={declared === 'C1' ? 'end' : 'center'}
        style={{left:`${declaredLevelPosition(declared)}%`}}>
        <span className="dashboard-level__mark" aria-hidden="true"/>
        <span className="dashboard-level__tooltip" aria-hidden="true">Seçiminiz · {declared}</span>
      </span>}
      {skills.filter(skill => skill.average !== null).map(skill => <span key={skill.key}
        className="dashboard-level__dot" data-skill={skill.key} role="img"
        aria-label={`${skill.label}: ${dashboardNumber(skill.average!)} / 75`}
        title={`${skill.label} · ${dashboardNumber(skill.average!)} / 75${skill.isStale ? ' · Eski sonuç' : ''}`}
        style={{left: `${scorePosition(skill.average!)}%`}}/>
      )}
      {average !== null && <ScaleMarker kind="mark" score={average} label={`Genel ortalama: ${dashboardNumber(average)} / 75`} description={`${hasStale ? 'Son tahmin' : 'Şu an'} · ${dashboardNumber(average)} / 75`}/>}
      <div className="dashboard-level__ticks" aria-hidden="true">
        {[0,38,51,65,75].map(tick => <span key={tick} style={{left: `${scorePosition(tick)}%`}}>{tick}</span>)}
      </div>
    </div>
  );
}
