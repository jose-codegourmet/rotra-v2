export const PLAYER_SESSION_TAB_IDS = ["courts", "queue", "standings"] as const;

export type PlayerSessionTabId = (typeof PLAYER_SESSION_TAB_IDS)[number];

export const PLAYER_SESSION_TABS = [
	{ id: "courts", label: "Courts", href: "/sessions/play/courts" },
	{ id: "queue", label: "Queue", href: "/sessions/play/queue" },
	{ id: "standings", label: "Standings", href: "/sessions/play/standings" },
] as const;

export type PlayerCourtStatus = "active" | "empty";

export type PlayerCourtSide = {
	label: string;
	players: readonly string[];
};

export type PlayerCourt = {
	id: string;
	name: string;
	status: PlayerCourtStatus;
	teamA?: PlayerCourtSide;
	teamB?: PlayerCourtSide;
	score?: string;
	elapsed?: string;
	emptyMessage?: string;
};

export type PlayerQueueBadge = "ready" | "waiting" | "you";

export type PlayerQueueAvatar = {
	id: string;
	initials: string;
	isYou?: boolean;
};

export type PlayerQueueRow = {
	id: string;
	rank: number;
	teamA: string;
	teamAWide?: string;
	teamB: string;
	waitLabel: string;
	badge: PlayerQueueBadge;
	isYou?: boolean;
	players: PlayerQueueAvatar[];
};

export type PlayerStandingRow = {
	id: string;
	rank: number;
	name: string;
	initials: string;
	status: string;
	record: string;
	points: string;
	isYou?: boolean;
	isGold?: boolean;
};

export const PLAYER_COURT_STATUS_LABELS: Record<PlayerCourtStatus, string> = {
	active: "ACTIVE",
	empty: "EMPTY",
};

export const PLAYER_QUEUE_BADGE_LABELS: Record<PlayerQueueBadge, string> = {
	ready: "READY",
	waiting: "WAITING",
	you: "YOU",
};

export const MOCK_PLAYER_SESSION = {
	venue: "Smash Hub Ortigas",
	sessionLabel: "Session",
	youChip: "YOU · JO",
	youName: "You · Jo Cruz",
	youStatus: "Player · queued",
	youInitials: "JO",
	vsLabel: "vs",
} as const;

export type PlayerSessionChrome = typeof MOCK_PLAYER_SESSION;

export const MOCK_PLAYER_COURTS_COPY = {
	eyebrow: "1 LIVE COURT",
	headline: "Courts",
	subLine: "Smash Hub Ortigas • 7:00—9:00 PM • Doubles",
	emptyMessage: "No match on this court. Next pairing is waiting in queue.",
} as const;

export const MOCK_PLAYER_COURTS: PlayerCourt[] = [
	{
		id: "court-1",
		name: "Court 1",
		status: "active",
		teamA: { label: "TEAM A", players: ["Jae Lim", "Mia Reyes"] },
		teamB: { label: "TEAM B", players: ["Kai Tan", "Lia Santos"] },
		score: "11—8",
		elapsed: "08:24 elapsed",
	},
	{
		id: "court-2",
		name: "Court 2",
		status: "empty",
		emptyMessage: MOCK_PLAYER_COURTS_COPY.emptyMessage,
	},
];

export const MOCK_PLAYER_QUEUE_COPY = {
	eyebrow: "YOU'RE 2ND · ~8 MIN",
	headline: "Queue",
	subLine: "Smash Hub Ortigas • 7:00—9:00 PM • 2 courts • Doubles",
	nextUpLabel: "NEXT UP · COURT 2 FREE",
	nextUpMatch: "Match 1",
	nextPairingLabel: "Next pairing",
	nextPairingBadge: "READY" as const,
	upNextLabel: "UP NEXT",
	viewOnlyHint: "View only",
	teamALabel: "TEAM A",
	teamBLabel: "TEAM B",
} as const;

export const MOCK_PLAYER_QUEUE_NEXT = {
	teamA: ["Nico Cruz", "Bea Ong"] as const,
	teamB: ["Eli Park", "Sam Cruz"] as const,
};

export const MOCK_PLAYER_QUEUE_ROWS: PlayerQueueRow[] = [
	{
		id: "match-2",
		rank: 2,
		teamA: "You + Drew",
		teamAWide: "You · Jo Cruz + Drew",
		teamB: "Pia + Ken",
		waitLabel: "8 min",
		badge: "you",
		isYou: true,
		players: [
			{ id: "jo", initials: "JO", isYou: true },
			{ id: "drew", initials: "DL" },
			{ id: "pia", initials: "PI" },
			{ id: "ken", initials: "KY" },
		],
	},
	{
		id: "match-3",
		rank: 3,
		teamA: "Ana + Jun",
		teamB: "Pat + Rio",
		waitLabel: "14 min",
		badge: "ready",
		players: [
			{ id: "ana", initials: "AD" },
			{ id: "jun", initials: "JM" },
			{ id: "pat", initials: "PS" },
			{ id: "rio", initials: "RG" },
		],
	},
	{
		id: "match-4",
		rank: 4,
		teamA: "Nina + Omar",
		teamB: "Val + Alex",
		waitLabel: "20 min",
		badge: "waiting",
		players: [
			{ id: "nina", initials: "NV" },
			{ id: "omar", initials: "OC" },
			{ id: "val", initials: "VC" },
			{ id: "alex", initials: "AL" },
		],
	},
];

export const MOCK_PLAYER_STANDINGS_COPY = {
	eyebrow: "LIVE · 4 MATCHES IN",
	headline: "Standings",
	subLine: "Smash Hub Ortigas • 7:00—9:00 PM • Doubles",
	playerColumn: "Player",
	recordColumn: "W—L",
	pointsColumn: "Pts",
	youBadge: "YOU",
} as const;

export const MOCK_PLAYER_STANDINGS: PlayerStandingRow[] = [
	{
		id: "jae-lim",
		rank: 1,
		name: "Jae Lim",
		initials: "JL",
		status: "On court 1",
		record: "3—0",
		points: "9",
		isGold: true,
	},
	{
		id: "mia-reyes",
		rank: 2,
		name: "Mia Reyes",
		initials: "MR",
		status: "On court 1",
		record: "2—1",
		points: "7",
	},
	{
		id: "jo-cruz",
		rank: 3,
		name: "Jo Cruz",
		initials: "JO",
		status: "Queued · match 2",
		record: "2—1",
		points: "6",
		isYou: true,
	},
	{
		id: "kai-tan",
		rank: 4,
		name: "Kai Tan",
		initials: "KT",
		status: "On court 1",
		record: "2—1",
		points: "6",
	},
	{
		id: "lia-santos",
		rank: 5,
		name: "Lia Santos",
		initials: "LS",
		status: "On court 1",
		record: "1—1",
		points: "4",
	},
	{
		id: "nico-cruz",
		rank: 6,
		name: "Nico Cruz",
		initials: "NC",
		status: "Next up",
		record: "1—1",
		points: "4",
	},
	{
		id: "bea-ong",
		rank: 7,
		name: "Bea Ong",
		initials: "BO",
		status: "Next up",
		record: "1—2",
		points: "3",
	},
];
