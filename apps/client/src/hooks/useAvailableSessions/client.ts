"use client";

import { useQuery } from "@tanstack/react-query";

import { availableSessionsQueryKey } from "./queryKey";
import { fetchAvailableSessions } from "./server";

export { availableSessionsQueryKey };

export function useAvailableSessions() {
	return useQuery({
		queryKey: availableSessionsQueryKey,
		queryFn: fetchAvailableSessions,
		staleTime: 60_000,
	});
}
