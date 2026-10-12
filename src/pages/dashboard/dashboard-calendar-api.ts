import { usePageDataQuery } from "@/hooks/use-page-data-query";
import { useAuth } from "@/contexts/AuthContext";
import axiosPrivate from "@/config/api";

export type CalendarActivity = {
  id: string;
  kind: "test" | "practice" | "exercise" | "lesson";
  title: string;
  href: string;
};
export type DashboardCalendar = {
  today: string;
  startDate: string;
  endDate: string;
  historyComplete: boolean;
  days: { date: string; activities: CalendarActivity[] }[];
};

export function useDashboardCalendar(today: string) {
  const { user, isAuthenticated } = useAuth();
  return usePageDataQuery({
    enabled: isAuthenticated && Boolean(user?.id),
    queryKey: ["dashboard", "activity-calendar", today],
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      const response = await axiosPrivate.get(
        "/api/me/dashboard/activity-calendar",
        {
          timeout: 12_000,
        },
      );
      return (
        response.data?.success === true ? response.data.data : response.data
      ) as DashboardCalendar;
    },
  });
}
