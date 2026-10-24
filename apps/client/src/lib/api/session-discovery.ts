import { db } from "@rotra/db";

import { haversineKm } from "@/lib/geo/haversine";
import type {
	SessionDiscoveryFilters,
	SessionDiscoveryItem,
	SessionGeoPoint,
	VenueSessionGroup,
} from "@/types/session-discovery";

const VENUE_KEY_PRECISION = 3;

export function deriveVenueKey(lat: number, lng: number): string {
	return `${lat.toFixed(VENUE_KEY_PRECISION)}_${lng.toFixed(VENUE_KEY_PRECISION)}`;
}

function isWeekend(iso: string): boolean {
	const day = new Date(iso).getDay();
	return day === 0 || day === 6;
}

function applyFilters(
	sessions: SessionDiscoveryItem[],
	filters: SessionDiscoveryFilters,
): SessionDiscoveryItem[] {
	let result = sessions;

	if (filters.clubQuery?.trim()) {
		const q = filters.clubQuery.trim().toLowerCase();
		result = result.filter((s) => s.clubName?.toLowerCase().includes(q));
	}

	if (filters.scheduleType) {
		result = result.filter((s) => s.scheduleType === filters.scheduleType);
	}

	if (filters.playersPerCourt != null) {
		result = result.filter(
			(s) => s.playersPerCourt === filters.playersPerCourt,
		);
	}

	if (filters.weekendOnly) {
		result = result.filter((s) => isWeekend(s.dateTime));
	}

	if (filters.dateFrom && filters.dateTo) {
		const { dateFrom, dateTo } = filters;
		result = result.filter((s) => {
			const d = s.dateTime.slice(0, 10);
			return d >= dateFrom && d <= dateTo;
		});
	}

	if (filters.slotAvailability === "full") {
		result = result.filter((s) => s.acceptedCount >= s.totalSlots);
	} else if (filters.slotAvailability === "not_full") {
		result = result.filter((s) => s.acceptedCount < s.totalSlots);
	}

	return result;
}

function withDistance(
	sessions: SessionDiscoveryItem[],
	origin: SessionGeoPoint,
	radiusKm: number,
): SessionDiscoveryItem[] {
	return sessions
		.map((session) => {
			if (!session.coordinates) {
				return { ...session, distanceKm: null };
			}
			const distanceKm = haversineKm(origin, session.coordinates);
			return { ...session, distanceKm };
		})
		.filter(
			(session) => session.distanceKm == null || session.distanceKm <= radiusKm,
		)
		.sort((a, b) => {
			const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
			const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
			if (distA !== distB) return distA - distB;
			return a.dateTime.localeCompare(b.dateTime);
		});
}

async function fetchOpenSessionItems(
	profileId: string,
): Promise<SessionDiscoveryItem[]> {
	const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

	const memberships = await db.clubMember.findMany({
		where: { playerId: profileId, status: "active" },
		select: { clubId: true },
	});
	const memberClubIds = new Set(memberships.map((m) => m.clubId));

	const rawSessions = await db.queueSession.findMany({
		where: { status: { in: ["open", "active"] } },
		include: {
			club: { select: { id: true, name: true } },
			registrations: {
				where: { admissionStatus: "accepted" },
				include: {
					player: { select: { id: true, name: true, avatarUrl: true } },
				},
			},
		},
	});

	const items: SessionDiscoveryItem[] = [];

	for (const s of rawSessions) {
		if (s.status === "open" && s.dateTime < twelveHoursAgo) continue;

		if (s.visibility === "club_members") {
			if (!s.clubId || !memberClubIds.has(s.clubId)) continue;
		}

		const coordinates =
			s.venueLat != null && s.venueLng != null
				? { lat: s.venueLat, lng: s.venueLng }
				: null;

		items.push({
			id: s.id,
			isOwner: s.hostId === profileId,
			clubId: s.clubId,
			clubName: s.club?.name ?? null,
			location: s.location,
			venueAddress: s.venueAddress,
			coordinates,
			venueKey: coordinates
				? deriveVenueKey(coordinates.lat, coordinates.lng)
				: s.id,
			dateTime: s.dateTime.toISOString(),
			endTime: s.endTime?.toISOString() ?? null,
			status: s.status as "open" | "active",
			scheduleType: s.scheduleType as SessionDiscoveryItem["scheduleType"],
			origin: s.origin as SessionDiscoveryItem["origin"],
			totalSlots: s.totalSlots,
			acceptedCount: s.registrations.length,
			recentPlayers: s.registrations.slice(0, 5).map((r) => ({
				id: r.player.id,
				displayName: r.player.name,
				avatarUrl: r.player.avatarUrl,
			})),
			distanceKm: null,
			playersPerCourt: s.playersPerCourt,
		});
	}

	return items;
}

export async function getAllOpenSessions(
	profileId: string,
): Promise<SessionDiscoveryItem[]> {
	const items = await fetchOpenSessionItems(profileId);
	return [...items].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

export async function getNearbySessions(
	origin: SessionGeoPoint,
	filters: SessionDiscoveryFilters,
	profileId: string,
): Promise<SessionDiscoveryItem[]> {
	const items = await fetchOpenSessionItems(profileId);
	const filtered = applyFilters(items, filters);
	return withDistance(filtered, origin, filters.radiusKm);
}

export function groupSessionsByVenue(
	sessions: SessionDiscoveryItem[],
): VenueSessionGroup[] {
	const groups = new Map<string, VenueSessionGroup>();

	for (const session of sessions) {
		if (!session.coordinates) continue;

		const existing = groups.get(session.venueKey);
		if (existing) {
			existing.sessions.push(session);
			continue;
		}

		groups.set(session.venueKey, {
			venueKey: session.venueKey,
			coordinates: session.coordinates,
			venueName: session.location,
			venueAddress: session.venueAddress,
			distanceKm: session.distanceKm,
			sessions: [session],
		});
	}

	return [...groups.values()]
		.map((group) => ({
			...group,
			sessions: [...group.sessions].sort((a, b) =>
				a.dateTime.localeCompare(b.dateTime),
			),
		}))
		.sort((a, b) => {
			const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
			const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
			return distA - distB;
		});
}

export async function buildDiscoveryResponse(
	origin: SessionGeoPoint,
	filters: SessionDiscoveryFilters,
	profileId: string,
) {
	const sessions = await getNearbySessions(origin, filters, profileId);
	const venueGroups = groupSessionsByVenue(sessions);
	return { sessions, venueGroups };
}
