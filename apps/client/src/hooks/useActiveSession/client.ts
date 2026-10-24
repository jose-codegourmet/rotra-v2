"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActiveSessionSummary } from "@/types/session-discovery";
import { activeSessionQueryKey } from "./queryKey";
import { fetchActiveSession } from "./server";

export { activeSessionQueryKey };

export function useActiveSession() {
	return useQuery({
		queryKey: activeSessionQueryKey,
		queryFn: fetchActiveSession,
		refetchInterval: 30_000,
		refetchOnWindowFocus: true,
		staleTime: 10_000,
	});
}

export function useEnrolledSessionState(): {
	current: ActiveSessionSummary | null;
	scheduled: ActiveSessionSummary | null;
	enrolled: ActiveSessionSummary | null;
	live: ActiveSessionSummary | null;
} {
	const { data } = useActiveSession();
	const current = data?.current ?? null;
	const scheduled = data?.scheduled ?? null;
	const enrolled = current ?? scheduled;
	const live = current?.status === "active" ? current : null;
	return { current, scheduled, enrolled, live };
}
