"use client";

import { useQuery } from "@tanstack/react-query";

import { sessionConsoleQueryKey } from "./queryKey";
import { fetchSessionConsole } from "./server";

export { sessionConsoleQueryKey };

export function useSessionConsole(sessionId: string, enabled = true) {
	return useQuery({
		queryKey: sessionConsoleQueryKey(sessionId),
		queryFn: () => fetchSessionConsole(sessionId),
		enabled,
		staleTime: 15_000,
		refetchInterval: 15_000,
	});
}
