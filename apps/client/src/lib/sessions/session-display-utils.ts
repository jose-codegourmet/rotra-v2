import { format, formatDistanceToNow } from "date-fns";

export function formatSessionDateTime(iso: string): string {
	return format(new Date(iso), "EEE, MMM d · h:mm a");
}

export function formatSessionCountdown(iso: string, now = new Date()): string {
	const target = new Date(iso);
	if (target.getTime() <= now.getTime()) {
		return "Starting now";
	}
	return `Starts ${formatDistanceToNow(target, { addSuffix: true })}`;
}

export function admissionBadgeLabel(status: string | null | undefined): string {
	if (!status) return "NOT REGISTERED";
	return status.replaceAll("_", " ").toUpperCase();
}

/** Accepted slots = courts × players/court. Overflow is waitlisted. */
export function acceptedCapacity(
	courts: number,
	playersPerCourt: number,
): number {
	return courts * playersPerCourt;
}
