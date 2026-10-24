export type SessionStatus =
	| "live"
	| "upcoming"
	| "open"
	| "completed"
	| "cancelled";

export const SESSIONS = [
	{
		id: "s1",
		status: "live" as SessionStatus,
		date: "Saturday, Apr 6",
		venue: "Hall B",
		time: "8:00 AM",
		slots: 12,
		total: 16,
		registrationStatus: "accepted",
		cost: 120,
		format: "Doubles",
		club: "Sunrise Badminton Club",
	},
	{
		id: "s2",
		status: "upcoming" as SessionStatus,
		date: "Saturday, Apr 12",
		venue: "Hall B",
		time: "8:00 AM",
		slots: 6,
		total: 16,
		registrationStatus: null,
		cost: 120,
		format: "Doubles",
		club: "Sunrise Badminton Club",
	},
	{
		id: "s3",
		status: "completed" as SessionStatus,
		date: "Mar 29",
		venue: "Hall A",
		time: "8:00 AM",
		slots: 16,
		total: 16,
		registrationStatus: "attended",
		cost: 120,
		format: "Doubles",
		club: "Sunrise Badminton Club",
		matchesPlayed: 5,
	},
];

export const STATUS_CONFIG: Record<
	SessionStatus,
	{ label: string; className: string; dotColor?: string }
> = {
	live: {
		label: "LIVE",
		className: "bg-accent/10 text-accent",
		dotColor: "bg-accent",
	},
	upcoming: {
		label: "UPCOMING",
		className: "bg-bg-elevated text-text-secondary",
	},
	open: {
		label: "OPEN",
		className: "bg-accent/10 text-accent",
	},
	completed: {
		label: "COMPLETED",
		className: "bg-bg-elevated text-text-disabled",
	},
	cancelled: {
		label: "CANCELLED",
		className: "bg-error/10 text-error",
	},
};

export const SESSION_FILTER_TABS = ["All", "Upcoming", "Completed"] as const;
