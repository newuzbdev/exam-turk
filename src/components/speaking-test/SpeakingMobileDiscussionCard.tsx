import type { ReactNode } from "react";
import { useMobilePresentation } from "@/hooks/use-mobile-presentation";

export default function SpeakingMobileDiscussionCard({
  title, advantages, disadvantages, children,
}: {
  title: string;
  advantages: string[];
  disadvantages: string[];
  children: ReactNode;
}) {
  const mobile = useMobilePresentation();
  if (!mobile) return children;

  return (
    <section className="speaking-mobile-discussion-card" aria-label="Konuşma konusu">
      {title && <h2 className="speaking-mobile-discussion-title">{title}</h2>}
      {[
        { title: "Lehine", points: advantages },
        { title: "Aleyhine", points: disadvantages },
      ].map(group => (
        <div className="speaking-mobile-discussion-points" key={group.title}>
          <h3>{group.title}</h3>
          <ul>{group.points.map((point, index) => <li key={index}>{point}</li>)}</ul>
        </div>
      ))}
    </section>
  );
}
