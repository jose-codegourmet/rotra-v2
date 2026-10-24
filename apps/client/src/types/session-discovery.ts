export type DashboardViewMode = "map" | "list" | "grid";

export interface SessionGeoPoint {
	lat: number;
	lng: number;
}

export interface SessionDiscoveryItem {
	id: string;
	isOwner: boolean;
	clubId: string | null;
	clubName: string | null;
	location: string;
	venueAddress: string | null;
	coordinates: SessionGeoPoint | null;
	/**
	 * Stable key for grouping sessions at the same physical court/venue.
	 * Derived by rounding lat/lng to 3 decimal places (~111m grid) in the API mapper.
	 */
	venueKey: string;
	dateTime: string;
	endTime: string | null;
	status: "open" | "active";
	scheduleType: "mmr" | "fun_games" | null;
	origin: "player_organized" | "club_queue";
	totalSlots: number;
	acceptedCount: number;
	recentPlayers: SessionPlayerPreview[];
	distanceKm: number | null;
	playersPerCourt: number;
}

export interface SessionPlayerPreview {
	id: string;
	displayName: string;
	avatarUrl: string | null;
}

export interface VenueSessionGroup {
	venueKey: string;
	coordinates: SessionGeoPoint;
	venueName: string;
	venueAddress: string | null;
	distanceKm: number | null;
	sessions: SessionDiscoveryItem[];
}

export interface SessionDiscoveryFilters {
	radiusKm: number;
	placeQuery?: string;
	clubQuery?: string;
	slotAvailability?: "full" | "not_full";
	scheduleType?: "mmr" | "fun_games";
	playersPerCourt?: number;
	weekendOnly?: boolean;
	/** Inclusive start date (yyyy-MM-dd) */
	dateFrom?: string;
	/** Inclusive end date (yyyy-MM-dd) */
	dateTo?: string;
}

export interface ActiveSessionSummary {
	sessionId: string;
	title: string | null;
	isOwner: boolean;
	// Null for clubless (player-organized) sessions; UI falls back to location.
	clubName: string | null;
	location: string;
	dateTime: string;
	status: "open" | "active";
	playerStatus: string;
	admissionStatus: string;
	courtHint: string | null;
	href: string;
}

export interface ActiveSessionResponse {
	/** Operating or start time reached — dashboard "in session" */
	current: ActiveSessionSummary | null;
	/** Enrolled but dateTime in the future */
	scheduled: ActiveSessionSummary | null;
}

export interface SessionDiscoveryResponse {
	sessions: SessionDiscoveryItem[];
	venueGroups: VenueSessionGroup[];
}
