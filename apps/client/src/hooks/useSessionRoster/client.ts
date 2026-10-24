"use client";

import { useQuery } from "@tanstack/react-query";

import { sessionRosterQueryKey } from "./queryKey";
import { fetchSessionRoster } from "./server";

export { sessionRosterQueryKey };

export function useSessionRoster(sessionId: string) {
	return useQuery({
		queryKey: sessionRosterQueryKey(sessionId),
		queryFn: () => fetchSessionRoster(sessionId),
		staleTime: 30_000,
	});
}
