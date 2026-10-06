import type { SVGProps } from "react";

export const ReadinessGaugeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="24" cy="24" r="17.5" stroke="currentColor" strokeWidth="2.2" />
    <path d="M12.5 27L9.5 27.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 17L13.8 14.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 13V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 17L34.2 14.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M35.5 27L38.5 27.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M24 28L33.5 18.5"
      stroke="var(--tm-accent)"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <circle cx="24" cy="28" r="2.75" fill="white" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);
