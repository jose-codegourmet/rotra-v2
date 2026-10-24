export type UserSessionStatus =
	| "draft"
	| "open"
	| "active"
	| "closed"
	| "completed"
	| "cancelled";

export interface UserSessionItem {
	id: string;
	title: string | null;
	isOwner: boolean;
	clubId: string | null;
	clubName: string | null;
	location: string;
	venueAddress: string | null;
	coordinates: { lat: number; lng: number } | null;
	dateTime: string;
	endTime: string | null;
	status: UserSessionStatus;
	totalSlots: number;
	acceptedCount: number;
	playersPerCourt: number;
	admissionStatus: string;
	playerStatus: string;
	href: string;
}

export interface UserSessionsResponse {
	sessions: UserSessionItem[];
}

export type UserSessionFilterTab = "All" | "Upcoming" | "Done";

export const USER_SESSION_FILTER_TABS: UserSessionFilterTab[] = [
	"All",
	"Upcoming",
	"Done",
];
