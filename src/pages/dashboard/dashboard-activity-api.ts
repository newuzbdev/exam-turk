import { useQuery } from "@tanstack/react-query";
import axiosPrivate from "@/config/api";
import type { DashboardPeriod } from "./dashboard-home-data";

export type DashboardActivity = {
  id: string;
  kind: "practice" | "exercise" | "lesson";
  title: string;
  timestamp: string;
  detail: string;
  href: string;
};
export type DashboardActivitySummary = {
  practiceCount: number;
  completedLessons: number;
  activities: DashboardActivity[];
};

export function useDashboardActivity(period: DashboardPeriod) {
  return useQuery({
    queryKey: ["dashboard", "activity", period],
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      const response = await axiosPrivate.get(
        `/api/me/dashboard/activity?period=${period}`,
        { timeout: 12_000 },
      );
      return (
        response.data?.success === true ? response.data.data : response.data
      ) as DashboardActivitySummary;
    },
  });
}
