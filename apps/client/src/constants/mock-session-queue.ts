export type QueuePlayerStatus = "ready" | "waiting";

export type QueueNextUpPlayer = {
	id: string;
	name: string;
	initials: string;
	waitLabel: string;
	status: QueuePlayerStatus;
};

export type QueueUpcomingPlayer = {
	id: string;
	initials: string;
};

export type QueueUpcomingMatch = {
	id: string;
	rank: number;
	teamA: string;
	teamB: string;
	waitLabel: string;
	status: QueuePlayerStatus;
	players: QueueUpcomingPlayer[];
};

export const QUEUE_STATUS_LABELS: Record<QueuePlayerStatus, string> = {
	ready: "READY",
	waiting: "WAITING",
};

export const MOCK_SESSION_QUEUE = {
	roleBadge: "QUE MASTER",
	eyebrow: "NEXT UP",
	headline: "Queue",
	subLine: "Smash Hub Ortigas • 7:00—9:00 PM • 2 courts • Doubles",
	nextUpLabel: "MATCH 1 • COURT 2 FREE",
	nextUpPairing: "Nico + Bea vs Eli + Sam",
	nextMatchesLabel: "NEXT MATCHES",
	reorderHint: "Drag to reorder",
	ctaLabel: "SEND TO COURT 2",
	sendToast: "Sent to Court 2.",
} as const;

export type SessionQueueFixture = typeof MOCK_SESSION_QUEUE;

export const MOCK_QUEUE_NEXT_UP_PLAYERS: QueueNextUpPlayer[] = [
	{
		id: "nico-cruz",
		name: "Nico Cruz",
		initials: "NC",
		waitLabel: "2 min",
		status: "ready",
	},
	{
		id: "bea-ortiz",
		name: "Bea Ortiz",
		initials: "BO",
		waitLabel: "2 min",
		status: "ready",
	},
	{
		id: "eli-park",
		name: "Eli Park",
		initials: "EP",
		waitLabel: "2 min",
		status: "ready",
	},
	{
		id: "sam-cruz",
		name: "Sam Cruz",
		initials: "SC",
		waitLabel: "2 min",
		status: "ready",
	},
];

export const MOCK_QUEUE_UPCOMING_MATCHES: QueueUpcomingMatch[] = [
	{
		id: "match-2",
		rank: 2,
		teamA: "Ana + Jun",
		teamB: "Pat + Rio",
		waitLabel: "8 min",
		status: "ready",
		players: [
			{ id: "ana", initials: "AD" },
			{ id: "jun", initials: "JM" },
			{ id: "pat", initials: "PS" },
			{ id: "rio", initials: "RG" },
		],
	},
	{
		id: "match-3",
		rank: 3,
		teamA: "Ken + Val",
		teamB: "Drew + Pia",
		waitLabel: "14 min",
		status: "waiting",
		players: [
			{ id: "ken", initials: "KY" },
			{ id: "val", initials: "VC" },
			{ id: "drew", initials: "DL" },
			{ id: "pia", initials: "PI" },
		],
	},
];
