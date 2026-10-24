import { format, isAfter } from "date-fns";
import type {
	SessionDiscoveryItem,
	VenueSessionGroup,
} from "@/types/session-discovery";

export type SessionDisplayStatus = "live" | "open" | "upcoming";

export function getSessionDisplayStatus(
	session: SessionDiscoveryItem,
	now = new Date(),
): SessionDisplayStatus {
	if (session.status === "active") return "live";
	if (isAfter(new Date(session.dateTime), now)) return "upcoming";
	return "open";
}

export function getSessionDisplayStatusLabel(
	status: SessionDisplayStatus,
): string {
	switch (status) {
		case "live":
			return "Live";
		case "open":
			return "Open";
		case "upcoming":
			return "Upcoming";
	}
}

export function getVenuePinVariant(
	group: VenueSessionGroup,
): "live" | "upcoming" {
	return group.sessions.some((session) => session.status === "active")
		? "live"
		: "upcoming";
}

export function isVenueFullyBooked(group: VenueSessionGroup): boolean {
	return (
		group.sessions.length > 0 &&
		group.sessions.every(
			(session) => session.acceptedCount >= session.totalSlots,
		)
	);
}

export function formatSessionDate(session: SessionDiscoveryItem): string {
	return format(new Date(session.dateTime), "EEE, MMM d");
}

export function formatSessionTime(
	session: SessionDiscoveryItem,
	now = new Date(),
): string {
	const date = new Date(session.dateTime);
	const status = getSessionDisplayStatus(session, now);
	if (status === "upcoming") {
		return format(date, "EEE h:mm a");
	}
	return format(date, "h:mm a");
}

export function formatSessionTimeRange(session: SessionDiscoveryItem): string {
	const start = format(new Date(session.dateTime), "h:mm a");
	if (!session.endTime) return start;
	const end = format(new Date(session.endTime), "h:mm a");
	return `${start} - ${end}`;
}

export function formatSessionDateTimeRange(
	session: SessionDiscoveryItem,
): string {
	return `${formatSessionDate(session)} · ${formatSessionTimeRange(session)}`;
}

export interface PanelFilterState {
	slotAvailability?: "full" | "not_full";
}

function sessionMatchesSlotAvailability(
	session: SessionDiscoveryItem,
	slotAvailability?: "full" | "not_full",
): boolean {
	if (!slotAvailability) return true;
	if (slotAvailability === "full") {
		return session.acceptedCount >= session.totalSlots;
	}
	return session.acceptedCount < session.totalSlots;
}

export function countMatchingSessions(
	venueGroups: VenueSessionGroup[],
	filters: PanelFilterState,
): number {
	return venueGroups.reduce((total, group) => {
		return (
			total +
			group.sessions.filter((session) =>
				sessionMatchesSlotAvailability(session, filters.slotAvailability),
			).length
		);
	}, 0);
}

export function countTotalSessions(venueGroups: VenueSessionGroup[]): number {
	return venueGroups.reduce((total, group) => total + group.sessions.length, 0);
}
