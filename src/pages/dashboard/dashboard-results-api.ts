import { useQuery } from "@tanstack/react-query";

import axiosPrivate from "@/config/api";
import type { DashboardOverallResult } from "./dashboard-performance";

type DashboardResultsPage = {
  data: DashboardOverallResult[];
  total: number;
  page: number;
  limit: number;
};

const DASHBOARD_RESULTS_PAGE_SIZE = 50;
const DASHBOARD_RESULTS_TIMEOUT_MS = 12_000;

const unwrapPage = (payload: unknown): DashboardResultsPage => {
  const envelopeData =
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
      ? (payload as { data: unknown }).data
      : payload;
  const page =
    envelopeData && typeof envelopeData === "object"
      ? (envelopeData as Partial<DashboardResultsPage>)
      : {};
  const data = Array.isArray(page.data) ? page.data : [];

  return {
    data,
    total: Number(page.total ?? data.length) || data.length,
    page: Number(page.page ?? 1) || 1,
    limit: Number(page.limit ?? DASHBOARD_RESULTS_PAGE_SIZE) ||
      DASHBOARD_RESULTS_PAGE_SIZE,
  };
};

const fetchDashboardResults = async (): Promise<DashboardOverallResult[]> => {
  const firstResponse = await axiosPrivate.get(
    `/api/overal-test-result/get-users?page=1&limit=${DASHBOARD_RESULTS_PAGE_SIZE}`,
    { timeout: DASHBOARD_RESULTS_TIMEOUT_MS },
  );
  const firstPage = unwrapPage(firstResponse.data);
  const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.limit));
  const results = [...firstPage.data];

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await axiosPrivate.get(
      `/api/overal-test-result/get-users?page=${page}&limit=${firstPage.limit}`,
      { timeout: DASHBOARD_RESULTS_TIMEOUT_MS },
    );
    results.push(...unwrapPage(response.data).data);
  }

  return results;
};

export const useDashboardResults = () =>
  useQuery({
    queryKey: ["dashboard", "overall-results"],
    queryFn: fetchDashboardResults,
    retry: 1,
    staleTime: 60_000,
    refetchInterval: (query) => {
      const results = query.state.data;
      const hasPendingEvaluation = results?.some(
        (result) =>
          String(result.writingEvaluationStatus ?? "").toUpperCase() ===
            "PENDING" ||
          String(result.speakingEvaluationStatus ?? "").toUpperCase() ===
            "PENDING",
      );
      return hasPendingEvaluation ? 2_500 : false;
    },
  });
