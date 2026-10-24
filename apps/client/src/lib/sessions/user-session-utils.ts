import { format } from "date-fns";
import type { UserSessionItem, UserSessionStatus } from "@/types/user-sessions";

export interface UserSessionStatusConfig {
	label: string;
	className: string;
	dotColor?: string;
}

export const USER_SESSION_STATUS_CONFIG: Record<
	UserSessionStatus,
	UserSessionStatusConfig
> = {
	active: {
		label: "LIVE",
		className: "bg-accent/10 text-accent",
		dotColor: "bg-accent",
	},
	open: {
		label: "OPEN",
		className: "bg-accent/10 text-accent",
	},
	draft: {
		label: "DRAFT",
		className: "bg-bg-elevated text-text-secondary",
	},
	closed: {
		label: "CLOSED",
		className: "bg-bg-elevated text-text-secondary",
	},
	completed: {
		label: "DONE",
		className: "bg-bg-elevated text-text-disabled",
	},
	cancelled: {
		label: "CANCELLED",
		className: "bg-error/10 text-error",
	},
};

export function isUserSessionDone(status: UserSessionStatus): boolean {
	return (
		status === "completed" || status === "cancelled" || status === "closed"
	);
}

export function isUserSessionUpcoming(status: UserSessionStatus): boolean {
	return status === "draft" || status === "open" || status === "active";
}

export function formatUserSessionDate(session: UserSessionItem): string {
	return format(new Date(session.dateTime), "EEEE, MMM d");
}

export function formatUserSessionTimeRange(session: UserSessionItem): string {
	const start = format(new Date(session.dateTime), "h:mm a");
	if (!session.endTime) return start;
	const end = format(new Date(session.endTime), "h:mm a");
	return `${start} - ${end}`;
}

export function formatAdmissionStatusLabel(admissionStatus: string): string {
	switch (admissionStatus) {
		case "accepted":
			return "Accepted";
		case "waitlisted":
			return "Waitlisted";
		case "reserved":
			return "Reserved";
		case "exited":
			return "Exited";
		default:
			return admissionStatus;
	}
}
