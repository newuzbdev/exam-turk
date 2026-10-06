import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  dashboardDate,
  dashboardNumber,
  dashboardReportPath,
  type ProgressSkill,
} from "./dashboard-home-data";

export function DashboardProgressChart({ skill }: { skill: ProgressSkill }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [width, setWidth] = useState(640);
  const chartRef = useRef<SVGSVGElement>(null);
  const points = skill.points.slice(0, 10).reverse();
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || typeof ResizeObserver === "undefined") return;
    // Keep labels at 12 CSS px on phones rather than shrinking a desktop SVG.
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      if (nextWidth > 0) setWidth(Math.max(240, nextWidth));
    });
    observer.observe(chart);
    return () => observer.disconnect();
  }, [points.length]);
  const active =
    points.find((point) => point.id === selected) ?? points[points.length - 1];
  const height = 244,
    left = 34,
    right = 22,
    top = 26,
    bottom = 32;
  const firstTime = points[0]?.timestamp ?? 0;
  const timeSpan = (points[points.length - 1]?.timestamp ?? 0) - firstTime;
  const x = (i: number) =>
    left +
    (timeSpan
      ? (points[i].timestamp - firstTime) / timeSpan
      : points.length > 1
        ? i / (points.length - 1)
        : 0.5) *
      (width - left - right);
  const y = (score: number) => top + (1 - score / 75) * (height - top - bottom);
  if (!points.length)
    return (
      <div className="student-home__chart-empty">
        <strong>Henüz sonuç yok</strong>
        <p>Test sonuçlarınız burada görünecek.</p>
      </div>
    );
  if (points.length === 1) {
    const point = points[0];
    return (
      <div className="student-home__chart-first">
        <div className="student-home__chart-first-score">
          <strong>{dashboardNumber(point.score)}</strong>
          <span>/ 75</span>
        </div>
        <div className="student-home__chart-first-copy">
          <strong>Test sonucu</strong>
          <time dateTime={new Date(point.timestamp).toISOString()}>
            {dashboardDate(point.timestamp)}
          </time>
        </div>
        <NavLink to={dashboardReportPath(point.id)}>
          Raporu aç <ArrowUpRight size={14} aria-hidden="true" />
        </NavLink>
      </div>
    );
  }
  const linePoints = points
    .map((point, i) => `${x(i)},${y(point.score)}`)
    .join(" ");
  return (
    <>
      <svg
        ref={chartRef}
        className="student-home__chart"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`${skill.label} puan gelişimi. 75 üzerinden son ${points.length} sonuç. Ayrıntılar grafiğin altında.`}
      >
        {[0, 15, 30, 45, 60, 75].map((score) => (
          <g key={score}>
            <line
              x1={left}
              x2={width - right}
              y1={y(score)}
              y2={y(score)}
              stroke="#e9e9eb"
              strokeDasharray={score ? "3 4" : undefined}
            />
            <text x={left - 10} y={y(score) + 4} textAnchor="end">
              {score}
            </text>
          </g>
        ))}
        <polygon
          className="dashboard-chart-area"
          points={`${linePoints} ${x(points.length - 1)},${y(0)} ${x(0)},${y(0)}`}
          fill="var(--skill-color, var(--home-accent))"
          fillOpacity={0.07}
          aria-hidden="true"
          pointerEvents="none"
        />
        <polyline
          points={linePoints}
          className="dashboard-chart-line"
          fill="none"
          stroke="var(--skill-color, var(--home-accent))"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {points.map((point, i) => (
          <g key={point.id}>
            <g
              className="student-home__chart-point"
              role="button"
              tabIndex={0}
              aria-label={`${dashboardDate(point.timestamp)} · ${dashboardNumber(point.score)} / 75`}
              aria-pressed={point.id === active?.id}
              onClick={() => setSelected(point.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(point.id);
                }
              }}
            >
              {point.id === active?.id && (
                <circle
                  className="dashboard-chart-halo"
                  cx={x(i)}
                  cy={y(point.score)}
                  r={10}
                  fill="var(--skill-color, var(--home-accent))"
                  fillOpacity={0.14}
                  aria-hidden="true"
                  pointerEvents="none"
                />
              )}
              <circle
                className="student-home__point-hit"
                cx={x(i)}
                cy={y(point.score)}
                r={16}
                fill="transparent"
              />
              <circle
                className="dashboard-chart-dot"
                cx={x(i)}
                cy={y(point.score)}
                r={point.id === active?.id ? 5 : 3.5}
                fill="var(--skill-color, var(--home-accent))"
                stroke="white"
                strokeWidth="2"
              />
            </g>
            {(i === 0 || i === points.length - 1) && (
              <text
                x={x(i)}
                y={height - 8}
                textAnchor={
                  points.length === 1 ? "middle" : i === 0 ? "start" : "end"
                }
              >
                {dashboardDate(point.timestamp)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="student-home__chart-reading" aria-live="polite">
        <span>
          {points.length} sonuç · {dashboardDate(active!.timestamp)}
        </span>
        <NavLink to={dashboardReportPath(active!.id)}>
          {dashboardNumber(active!.score)} / 75{" "}
          <ArrowUpRight size={14} aria-hidden="true" />
        </NavLink>
      </div>
      <details className="student-home__chart-data">
        <summary>Sonuçları listele</summary>
        <div>
          {points.map((point) => (
            <button
              type="button"
              key={point.id}
              onClick={() => setSelected(point.id)}
              aria-pressed={active?.id === point.id}
            >
              {dashboardDate(point.timestamp)}
              <strong>{dashboardNumber(point.score)} / 75</strong>
            </button>
          ))}
        </div>
      </details>
    </>
  );
}
