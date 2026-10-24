"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_RADIUS_KM } from "@/constants/dashboard";
import type { SessionDiscoveryFilters } from "@/types/session-discovery";
import { sessionDiscoveryQueryKey } from "./queryKey";
import { fetchSessionDiscovery } from "./server";

export { sessionDiscoveryQueryKey };

export function useSessionDiscovery(
	lat: number | undefined,
	lng: number | undefined,
	filters: Partial<SessionDiscoveryFilters> = {},
) {
	const resolvedFilters: SessionDiscoveryFilters = {
		radiusKm: filters.radiusKm ?? DEFAULT_RADIUS_KM,
		...filters,
	};

	return useQuery({
		queryKey:
			lat != null && lng != null
				? sessionDiscoveryQueryKey(lat, lng, resolvedFilters)
				: [...sessionDiscoveryQueryKey(0, 0, resolvedFilters), "disabled"],
		queryFn: () =>
			fetchSessionDiscovery(lat as number, lng as number, resolvedFilters),
		enabled: lat != null && lng != null,
		staleTime: 60_000,
	});
}
