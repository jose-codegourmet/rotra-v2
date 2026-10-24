"use client";

import { useQuery } from "@tanstack/react-query";

import { userSessionsQueryKey } from "./queryKey";
import { fetchUserSessions } from "./server";

export { userSessionsQueryKey };

export function useUserSessions() {
	return useQuery({
		queryKey: userSessionsQueryKey,
		queryFn: fetchUserSessions,
		staleTime: 60_000,
	});
}
