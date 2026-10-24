"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/hooks/useProfile/server";

export function profileQueryKey(userId: string) {
	return ["profile", userId] as const;
}

/**
 * Loads public profile fields for a player id (requires an authenticated session).
 */
export function useProfile(userId: string | undefined) {
	return useQuery({
		queryKey: userId ? profileQueryKey(userId) : ["profile", "none"],
		queryFn: () => fetchProfile(userId as string),
		enabled: Boolean(userId),
	});
}
