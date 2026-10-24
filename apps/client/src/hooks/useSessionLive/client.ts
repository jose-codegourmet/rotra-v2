"use client";

import { useQuery } from "@tanstack/react-query";

import { sessionLiveQueryKey } from "./queryKey";
import { fetchSessionLive } from "./server";

export { sessionLiveQueryKey };

export function useSessionLive(sessionId: string) {
	return useQuery({
		queryKey: sessionLiveQueryKey(sessionId),
		queryFn: () => fetchSessionLive(sessionId),
		staleTime: 60_000,
	});
}
