import { tm } from "@/components/tm";
import { DashboardLevelScale } from "@/pages/dashboard/dashboard-level-summary";
import { dashboardNumber, type ProgressSkill } from "@/pages/dashboard/dashboard-home-data";
import "@/pages/dashboard/dashboard-reference.css";
import "./home-score-preview.css";

const exampleSkills: Pick<ProgressSkill, 'key' | 'label' | 'average' | 'isStale'>[] = [
  { key: "listening", label: "Dinleme", average: 57, isStale: false },
  { key: "reading", label: "Okuma", average: 55, isStale: false },
  { key: "writing", label: "Yazma", average: 48, isStale: false },
  { key: "speaking", label: "Konuşma", average: 52, isStale: false },
];

export default function HomeScorePreview() {
  return (
    <section id="seviye-analizi" className="home-score-preview scroll-mt-20 bg-white py-9 sm:py-11" aria-label="Örnek CEFR seviye gösterimi">
      <div className={tm.container}>
        <h2 className="home-score-preview__title">Hedefini belirle</h2>
        <div className="home-score-preview__heading">
          <div className="home-score-preview__intro">
            <p className="home-score-preview__level">B2</p>
            <p>Deneme sınavı <strong>0–75</strong> puan üzerinden değerlendirilir. Bu çizgi, seviyeni ve hedefe ne kadar yaklaştığını gösterir.</p>
          </div>
          <p className="home-score-preview__example">Örnek sonuç <span>·</span> <strong>53 / 75</strong></p>
        </div>
        <div className="student-home home-score-preview__chart">
          <DashboardLevelScale average={53} skills={exampleSkills} target="C1" />
          <ul className="home-score-preview__legend" aria-label="Örnek beceri puanları">
            {exampleSkills.map((skill) => <li key={skill.key} data-skill={skill.key}>
              <span className="home-score-preview__dot" aria-hidden="true" />
              <span>{skill.label}</span>
              <strong>{dashboardNumber(skill.average!)}</strong>
            </li>)}
          </ul>
        </div>
        <p className="home-score-preview__caption">Siyah çizgi genel puanı, kesik çizgi C1 hedefini, renkli noktalar beceri puanlarını gösterir.</p>
      </div>
    </section>
  );
}
