import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  createLucideIcon,
  Dumbbell,
  FilePenLine,
  Info,
  type LucideIcon,
} from "lucide-react";


const DashboardHomeIcon = createLucideIcon("DashboardHome", [
  [
    "path",
    {
      d: "M12 17V13",
      key: "dashboard-home-door",
    },
  ],
  [
    "path",
    {
      d: "M2 8L11.7317 3.13416C11.9006 3.04971 12.0994 3.0497 12.2683 3.13416L22 8",
      key: "dashboard-home-roof",
    },
  ],
  [
    "path",
    {
      d: "M20 11V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V11",
      key: "dashboard-home-body",
    },
  ],
]);

export type StudentAppNavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
  mobileLabel?: string;
};

export const getStudentAppNavigation = (lessonsEnabled:boolean): StudentAppNavigationItem[] => [
  {
    label: "Dashboard",
    to: "/app",
    icon: DashboardHomeIcon,
  },
  {
    label: "Dersler",
    to: "/app/dersler",
    icon: BookOpen,
    disabled: !lessonsEnabled,
    badge: lessonsEnabled ? undefined : "Yakında",
  },
  {
    label: "Pratik",
    to: "/app/pratik",
    icon: Dumbbell,
  },
  {
    label: "Mock Test",
    to: "/app/test",
    icon: FilePenLine,
  },
  {
    label: "Raporlar",
    to: "/app/sonuclar",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    label: "Sınav Bilgileri",
    mobileLabel: "Sınav Bilgisi",
    to: "/app/sinav-bilgileri",
    icon: Info,
  },
];

export const isStudentAppNavigationActive = (
  pathname: string,
  target: string,
) => {
  if (target === "/app") return pathname === target;
  if (target === "/app/sonuclar" && (pathname.startsWith("/overall-results/") || pathname.startsWith("/app/overall-results/"))) {
    return true;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
};

export const STUDENT_APP_NAVIGATION = getStudentAppNavigation(false);
