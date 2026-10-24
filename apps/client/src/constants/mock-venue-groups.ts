import { MOCK_SESSION_DISCOVERY } from "@/constants/mock-session-discovery";
import type {
	SessionDiscoveryItem,
	VenueSessionGroup,
} from "@/types/session-discovery";

function withDistance(
	sessions: SessionDiscoveryItem[],
	distanceKm = 1.2,
): SessionDiscoveryItem[] {
	return sessions.map((session) => ({ ...session, distanceKm }));
}

function findMockSession(id: string): SessionDiscoveryItem {
	const session = MOCK_SESSION_DISCOVERY.find((item) => item.id === id);
	if (!session) {
		throw new Error(`Missing mock session: ${id}`);
	}
	return session;
}

export const MOCK_VENUE_GROUPS: VenueSessionGroup[] = [
	{
		venueKey: "10.316_123.885",
		coordinates: { lat: 10.316, lng: 123.885 },
		venueName: "Sunrise Badminton Center",
		venueAddress: "Juan Luna Ave, Cebu City, Cebu",
		distanceKm: 1.2,
		sessions: withDistance([
			findMockSession("sess-sunrise-today"),
			findMockSession("sess-sunrise-weekend"),
		]),
	},
	{
		venueKey: "10.324_123.923",
		coordinates: { lat: 10.324, lng: 123.923 },
		venueName: "Mandaue City Sports Complex",
		venueAddress: "Cebu North Rd, Mandaue City, Cebu",
		distanceKm: 1.2,
		sessions: withDistance([findMockSession("sess-mandaue-live")]),
	},
	{
		venueKey: "10.310_123.949",
		coordinates: { lat: 10.31, lng: 123.949 },
		venueName: "Hoops Dome Lapu-Lapu",
		venueAddress: "Gun-ob, Lapu-Lapu City, Cebu",
		distanceKm: 1.2,
		sessions: withDistance([findMockSession("sess-lapulapu-open")]),
	},
	{
		venueKey: "10.329_123.905",
		coordinates: { lat: 10.329, lng: 123.905 },
		venueName: "Cebu IT Park Courts",
		venueAddress: "Jose Maria del Mar St, Cebu City, Cebu",
		distanceKm: 1.2,
		sessions: withDistance([findMockSession("sess-cebu-downtown")]),
	},
	{
		venueKey: "10.244_123.848",
		coordinates: { lat: 10.244, lng: 123.848 },
		venueName: "Talisay Sports Center",
		venueAddress: "Tabunok, Talisay City, Cebu",
		distanceKm: 1.2,
		sessions: withDistance([findMockSession("sess-talisay-weekend")]),
	},
];

export const MOCK_SINGLE_LIVE_GROUP: VenueSessionGroup = {
	venueKey: "10.324_123.923",
	coordinates: { lat: 10.324, lng: 123.923 },
	venueName: "Mandaue City Sports Complex",
	venueAddress: "Cebu North Rd, Mandaue City, Cebu",
	distanceKm: 1.2,
	sessions: [findMockSession("sess-mandaue-live")],
};

export const MOCK_SINGLE_UPCOMING_GROUP: VenueSessionGroup = {
	venueKey: "10.310_123.949",
	coordinates: { lat: 10.31, lng: 123.949 },
	venueName: "Hoops Dome Lapu-Lapu",
	venueAddress: "Gun-ob, Lapu-Lapu City, Cebu",
	distanceKm: 1.5,
	sessions: [findMockSession("sess-lapulapu-open")],
};

function findMockVenueGroup(venueKey: string): VenueSessionGroup {
	const group =
		MOCK_VENUE_GROUPS.find((item) => item.venueKey === venueKey) ??
		MOCK_VENUE_GROUPS[0];
	if (!group) {
		throw new Error("MOCK_VENUE_GROUPS is empty");
	}
	return group;
}

export const MOCK_MULTI_THREE_GROUP: VenueSessionGroup =
	findMockVenueGroup("10.316_123.885");

export function buildMultiSessionGroup(count: number): VenueSessionGroup {
	const base = findMockSession("sess-lapulapu-open");
	const sessions = Array.from({ length: count }, (_, index) => ({
		...base,
		id: `sess-lapulapu-${index + 1}`,
		dateTime: new Date(Date.now() + (index + 1) * 3_600_000).toISOString(),
		acceptedCount: index * 2,
	}));

	return {
		venueKey: "10.310_123.949",
		coordinates: { lat: 10.31, lng: 123.949 },
		venueName: "Lapu-Lapu Hoops Dome",
		venueAddress: "Gun-ob, Lapu-Lapu City, Cebu",
		distanceKm: 1.5,
		sessions,
	};
}

export const MOCK_FULL_GROUP: VenueSessionGroup = {
	...MOCK_MULTI_THREE_GROUP,
	sessions: MOCK_MULTI_THREE_GROUP.sessions.map((session) => ({
		...session,
		acceptedCount: session.totalSlots,
	})),
};

export const MOCK_EMPTY_PLAYERS_GROUP: VenueSessionGroup = {
	venueKey: "10.244_123.848",
	coordinates: { lat: 10.244, lng: 123.848 },
	venueName: "Talisay Sports Center",
	venueAddress: "Tabunok, Talisay City, Cebu",
	distanceKm: 8.4,
	sessions: [findMockSession("sess-talisay-weekend")],
};

export const MOCK_AVATAR_OVERFLOW_SESSION: SessionDiscoveryItem = {
	...findMockSession("sess-sunrise-today"),
	acceptedCount: 12,
	recentPlayers: [
		{ id: "p1", displayName: "Miguel R.", avatarUrl: null },
		{ id: "p2", displayName: "Ana L.", avatarUrl: null },
		{ id: "p3", displayName: "Carlos D.", avatarUrl: null },
		{ id: "p4", displayName: "Jenny T.", avatarUrl: null },
	],
};

export const MOCK_AVATAR_OVERFLOW_GROUP: VenueSessionGroup = {
	venueKey: "10.316_123.885",
	coordinates: { lat: 10.316, lng: 123.885 },
	venueName: "Sunrise Badminton Center",
	venueAddress: "Juan Luna Ave, Cebu City, Cebu",
	distanceKm: 1.2,
	sessions: [MOCK_AVATAR_OVERFLOW_SESSION],
};
