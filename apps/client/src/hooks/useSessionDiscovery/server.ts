import { DEFAULT_RADIUS_KM } from "@/constants/dashboard";
import type {
	SessionDiscoveryFilters,
	SessionDiscoveryResponse,
} from "@/types/session-discovery";

function buildDiscoverSearchParams(
	lat: number,
	lng: number,
	filters: SessionDiscoveryFilters,
): string {
	const params = new URLSearchParams({
		lat: String(lat),
		lng: String(lng),
		radiusKm: String(filters.radiusKm),
	});
	if (filters.clubQuery) params.set("clubQuery", filters.clubQuery);
	if (filters.placeQuery) params.set("placeQuery", filters.placeQuery);
	if (filters.slotAvailability)
		params.set("slotAvailability", filters.slotAvailability);
	if (filters.scheduleType) params.set("scheduleType", filters.scheduleType);
	if (filters.playersPerCourt != null)
		params.set("playersPerCourt", String(filters.playersPerCourt));
	if (filters.weekendOnly) params.set("weekendOnly", "true");
	if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
	if (filters.dateTo) params.set("dateTo", filters.dateTo);
	return params.toString();
}

export async function fetchSessionDiscovery(
	lat: number,
	lng: number,
	filters: Partial<SessionDiscoveryFilters> = {},
): Promise<SessionDiscoveryResponse> {
	const resolvedFilters: SessionDiscoveryFilters = {
		radiusKm: filters.radiusKm ?? DEFAULT_RADIUS_KM,
		...filters,
	};
	const qs = buildDiscoverSearchParams(lat, lng, resolvedFilters);
	const res = await fetch(`/api/sessions/discover?${qs}`);
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<SessionDiscoveryResponse>;
}

export async function prefetchSessionDiscovery(
	queryClient: import("@tanstack/react-query").QueryClient,
	lat: number,
	lng: number,
	filters: Partial<SessionDiscoveryFilters> = {},
) {
	const { sessionDiscoveryQueryKey } = await import("./queryKey");
	const resolvedFilters: SessionDiscoveryFilters = {
		radiusKm: filters.radiusKm ?? DEFAULT_RADIUS_KM,
		...filters,
	};
	await queryClient.prefetchQuery({
		queryKey: sessionDiscoveryQueryKey(lat, lng, resolvedFilters),
		queryFn: () => fetchSessionDiscovery(lat, lng, resolvedFilters),
	});
}
