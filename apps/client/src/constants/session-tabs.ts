export const QM_TAB_IDS = [
	"courts",
	"queue",
	"players",
	"requests",
	"collections",
	"feed",
] as const;

export type QMTabId = (typeof QM_TAB_IDS)[number];

export const QM_TAB_LABELS: Record<QMTabId, string> = {
	courts: "Courts",
	queue: "Queue",
	players: "Players",
	requests: "Requests",
	collections: "Collections",
	feed: "Feed",
};

export const PLAYER_TAB_IDS = [
	"overview",
	"courts",
	"queue",
	"feed",
	"standings",
] as const;

export type PlayerTabId = (typeof PLAYER_TAB_IDS)[number];

export const PLAYER_TAB_LABELS: Record<PlayerTabId, string> = {
	overview: "Overview",
	courts: "Courts",
	queue: "Queue",
	feed: "Feed",
	standings: "Standings",
};
