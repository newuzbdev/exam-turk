import type { SVGProps } from "react";

export const TelegramIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M20.92 3.63 3.18 10.47c-1.21.49-1.2 1.17-.22 1.47l4.55 1.42 1.75 5.37c.21.58.11.81.72.81.47 0 .68-.22.94-.47l2.19-2.13 4.56 3.37c.84.46 1.45.22 1.66-.78l3-14.13c.31-1.23-.47-1.79-1.41-1.41Zm-2.05 3.25-9.05 8.17-.35 3.72-1.36-4.18 10.13-6.39c.47-.29.9-.14.63.68Z"
      fill="currentColor"
    />
  </svg>
);

export const TelegramOutlineIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="1.5 2.2 22 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M21.08 3.76 2.86 10.81c-1.03.4-1 1.08.06 1.4l4.65 1.44 1.8 5.48c.25.77.96.88 1.47.39l2.58-2.5 4.51 3.31c.77.56 1.5.2 1.69-.71l2.77-14.68c.2-1.02-.45-1.51-1.31-1.18Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m7.57 13.65 10.64-6.78c.45-.29.82.3.44.65l-8.83 8.11-.45 3.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
