/** Static mock notifications for client UI — no API. */

export type NotificationKind =
	| "session"
	| "match"
	| "club"
	| "review"
	| "exp"
	| "system";

export type NotificationSeverity = "urgent" | "warning" | "info";

export type Notification = {
	id: string;
	kind: NotificationKind;
	severity: NotificationSeverity;
	title: string;
	message: string;
	/** Human-friendly relative time, e.g. "12 min ago" */
	time: string;
	unread: boolean;
};

export const MOCK_NOTIFICATIONS: Notification[] = [
	{
		id: "1",
		kind: "session",
		severity: "warning",
		title: "Session reminder",
		message: "Your session at Hall B starts in 1 hour.",
		time: "3 min ago",
		unread: true,
	},
	{
		id: "2",
		kind: "match",
		severity: "urgent",
		title: "You're up next",
		message: "You're up next on Court 2. Get ready!",
		time: "12 min ago",
		unread: true,
	},
	{
		id: "3",
		kind: "review",
		severity: "warning",
		title: "Submit your reviews",
		message: "2 hours left to submit your match reviews.",
		time: "1 hr ago",
		unread: true,
	},
	{
		id: "4",
		kind: "club",
		severity: "info",
		title: "Join request approved",
		message: "Your request to join Sunrise BC has been approved.",
		time: "2 hr ago",
		unread: true,
	},
	{
		id: "5",
		kind: "exp",
		severity: "info",
		title: "EXP from today's session",
		message: "You earned +35 EXP from today's session.",
		time: "3 hr ago",
		unread: true,
	},
	{
		id: "6",
		kind: "club",
		severity: "info",
		title: "New session created",
		message: "A Que Master created a new session at Hall B on Apr 5.",
		time: "5 hr ago",
		unread: true,
	},
	{
		id: "7",
		kind: "session",
		severity: "info",
		title: "Session cancelled",
		message: "Session cancelled: Metro BC · Apr 2",
		time: "Yesterday",
		unread: true,
	},
	{
		id: "8",
		kind: "system",
		severity: "info",
		title: "Club application approved",
		message: "Your club application for Sunrise BC was approved.",
		time: "Yesterday",
		unread: true,
	},
	{
		id: "9",
		kind: "match",
		severity: "info",
		title: "Match complete",
		message: "Session ended. View the final leaderboard.",
		time: "2 days ago",
		unread: false,
	},
	{
		id: "10",
		kind: "exp",
		severity: "info",
		title: "Level up",
		message: "You've leveled up to Warrior 2!",
		time: "3 days ago",
		unread: false,
	},
	{
		id: "11",
		kind: "review",
		severity: "info",
		title: "Great match feedback",
		message: "An opponent rated your performance highly. +5 EXP bonus.",
		time: "4 days ago",
		unread: false,
	},
	{
		id: "12",
		kind: "system",
		severity: "urgent",
		title: "Playing level adjusted",
		message: "Your playing level has been adjusted by the system.",
		time: "5 days ago",
		unread: false,
	},
];

/** Notifications matching `severity` (stable order: same as MOCK_NOTIFICATIONS). */
export function notificationsBySeverity(
	severity: NotificationSeverity,
): Notification[] {
	return MOCK_NOTIFICATIONS.filter((n) => n.severity === severity);
}

/** Count of unread notifications in the mock list (for badge demos). */
export function countUnreadNotifications(
	notifications: Notification[],
): number {
	return notifications.filter((n) => n.unread).length;
}
