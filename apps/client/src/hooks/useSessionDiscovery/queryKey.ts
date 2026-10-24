import type { SessionDiscoveryFilters } from "@/types/session-discovery";

export const sessionDiscoveryRootKey = ["sessions", "discover"] as const;

export function sessionDiscoveryQueryKey(
	lat: number,
	lng: number,
	filters: SessionDiscoveryFilters,
) {
	return [
		...sessionDiscoveryRootKey,
		lat,
		lng,
		filters.radiusKm,
		filters.clubQuery ?? "",
		filters.placeQuery ?? "",
		filters.slotAvailability ?? "",
		filters.scheduleType ?? "",
		filters.playersPerCourt ?? "",
		filters.weekendOnly ?? false,
		filters.dateFrom ?? "",
		filters.dateTo ?? "",
	] as const;
}
