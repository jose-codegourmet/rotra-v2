/** Static fixtures for session queue UI stories and demo page — not authoritative domain data. */

export type SessionTabId = "queue" | "standing" | "statistics" | "financials";

export const SESSION_TAB_IDS: SessionTabId[] = [
	"queue",
	"standing",
	"statistics",
	"financials",
];

export const SESSION_TAB_LABELS: Record<SessionTabId, string> = {
	queue: "Active queue",
	standing: "Standing",
	statistics: "Statistics",
	financials: "Financials",
};

export interface CourtCardData {
	id: string;
	label: string;
	variant: "active" | "empty";
	league?: string;
	teamA?: { names: string; score?: number };
	teamB?: { names: string; score?: number };
	/** 0–1 for progress bar */
	progress?: number;
}

export interface NextQueueItem {
	id: string;
	label: string;
	matchup: string;
	waitLabel: string;
}

export type PlayerRosterStatus = "waiting" | "playing" | "ready" | "away";

export interface PlayerQueueCardData {
	id: string;
	name: string;
	recordLabel: string;
	statusLabel: string;
	status: PlayerRosterStatus;
	disabled?: boolean;
}

export interface StandingRow {
	rank: number;
	name: string;
	wins: number;
	losses: number;
	winPct: number;
	highlight?: boolean;
}

export interface ChartPoint {
	slot: string;
	live: number;
	projected?: number;
}

export interface LedgerRow {
	id: string;
	name: string;
	subtitle?: string;
	games: number;
	timeRange: string;
	payment: "paid" | "pending" | "partial";
}

export interface FinancialLineItem {
	label: string;
	value: string;
}

export const MOCK_COURTS: CourtCardData[] = [
	{
		id: "c1",
		label: "Court 01",
		variant: "active",
		league: "Pro league",
		teamA: { names: "Jose & John", score: 21 },
		teamB: { names: "Peter & P2", score: 19 },
		progress: 0.72,
	},
	{
		id: "c2",
		label: "Court 02",
		variant: "active",
		league: "Pro league",
		teamA: { names: "Alex & Sam", score: 15 },
		teamB: { names: "Kim & Lee", score: 12 },
		progress: 0.45,
	},
	{
		id: "c3",
		label: "Court 03",
		variant: "active",
		league: "Training",
		teamA: { names: "M. Chen & R. Diaz", score: 8 },
		teamB: { names: "T. Wu & J. Park", score: 11 },
		progress: 0.3,
	},
	{
		id: "c4",
		label: "Court 04",
		variant: "empty",
	},
	{
		id: "c5",
		label: "Court 05",
		variant: "empty",
	},
];

export const MOCK_NEXT_QUEUE: NextQueueItem[] = [
	{
		id: "q1",
		label: "Q-01",
		matchup: "T. Anderson vs J. Smith",
		waitLabel: "WAIT: 12M",
	},
	{
		id: "q2",
		label: "Q-02",
		matchup: "Team Nova vs Team Apex",
		waitLabel: "WAIT: 24M",
	},
	{
		id: "q3",
		label: "Q-03",
		matchup: "Doubles — Hall A pick",
		waitLabel: "WAIT: 36M",
	},
];

export const MOCK_STANDING_MINI: StandingRow[] = [
	{ rank: 1, name: "Marcus Chen", wins: 4, losses: 0, winPct: 100 },
	{ rank: 2, name: "Alex Rivera", wins: 3, losses: 1, winPct: 75 },
	{ rank: 3, name: "Sam Okonkwo", wins: 2, losses: 2, winPct: 50 },
];

export const MOCK_ROSTER: PlayerQueueCardData[] = [
	{
		id: "p1",
		name: "Marcus Chen",
		recordLabel: "2-0 standing (2 games)",
		statusLabel: "10 mins waiting",
		status: "waiting",
	},
	{
		id: "p2",
		name: "Alex Rivera",
		recordLabel: "1-1 standing (3 games)",
		statusLabel: "PLAYING at court 1",
		status: "playing",
	},
	{
		id: "p3",
		name: "Jordan Lee",
		recordLabel: "3-0 standing (4 games)",
		statusLabel: "2 mins waiting",
		status: "waiting",
	},
	{
		id: "p4",
		name: "John Smith",
		recordLabel: "0-2 standing (2 games)",
		statusLabel: "AWAY (eating)",
		status: "away",
		disabled: true,
	},
	{
		id: "p5",
		name: "Riley Park",
		recordLabel: "1-0 standing (1 game)",
		statusLabel: "Ready",
		status: "ready",
	},
];

export const MOCK_STANDING_FULL: StandingRow[] = [
	{
		rank: 1,
		name: "Marcus Chen",
		wins: 8,
		losses: 1,
		winPct: 89,
		highlight: true,
	},
	{ rank: 2, name: "Alex Rivera", wins: 7, losses: 2, winPct: 78 },
	{ rank: 3, name: "Sam Okonkwo", wins: 6, losses: 3, winPct: 67 },
	{ rank: 4, name: "Jordan Lee", wins: 5, losses: 4, winPct: 56 },
	{ rank: 5, name: "T. Anderson", wins: 4, losses: 4, winPct: 50 },
	{ rank: 6, name: "J. Smith", wins: 3, losses: 5, winPct: 38 },
];

export const MOCK_CHART_POINTS: ChartPoint[] = [
	{ slot: "6PM", live: 8, projected: 6 },
	{ slot: "6:30", live: 12, projected: 10 },
	{ slot: "7PM", live: 22, projected: 18 },
	{ slot: "7:30", live: 28, projected: 24 },
	{ slot: "8PM", live: 36, projected: 32 },
	{ slot: "8:30", live: 34, projected: 38 },
	{ slot: "9PM", live: 30, projected: 35 },
	{ slot: "9:30", live: 24, projected: 28 },
];

export const MOCK_LEDGER: LedgerRow[] = [
	{
		id: "l1",
		name: "Marcus R.",
		subtitle: "Regular member",
		games: 8,
		timeRange: "7:00PM - 10:00PM",
		payment: "paid",
	},
	{
		id: "l2",
		name: "Alex Rivera",
		subtitle: "Regular member",
		games: 6,
		timeRange: "7:00PM - 9:30PM",
		payment: "pending",
	},
	{
		id: "l3",
		name: "Sam Okonkwo",
		subtitle: "Guest",
		games: 4,
		timeRange: "8:00PM - 10:00PM",
		payment: "paid",
	},
	{
		id: "l4",
		name: "Jordan Lee",
		subtitle: "Regular member",
		games: 5,
		timeRange: "7:30PM - 10:00PM",
		payment: "partial",
	},
];

export const MOCK_FINANCIAL_LINES: FinancialLineItem[] = [
	{ label: "Court fee", value: "$240.00" },
	{ label: "Court per hour", value: "$40.00/h" },
	{ label: "Entrance fee", value: "$312.00" },
	{ label: "Shuttle cock", value: "$84.50" },
];

export const MOCK_KPIS = [
	{ label: "Total matches", value: "142", hint: "+12%" },
	{ label: "Active players", value: "36", hint: "Live" },
	{ label: "Avg. duration", value: "24m", hint: "Optimal" },
	{ label: "Peak load", value: "98%", hint: "8:15 PM" },
] as const;

/** Pool for assign-court modal */
export const MOCK_ASSIGN_PLAYERS: PlayerQueueCardData[] = [
	{
		id: "a1",
		name: "Marcus Chen",
		recordLabel: "2-0 standing (2 games)",
		statusLabel: "10 MINS WAITING",
		status: "waiting",
	},
	{
		id: "a2",
		name: "Alex Rivera",
		recordLabel: "1-1 standing (3 games)",
		statusLabel: "PLAYING AT COURT 1",
		status: "playing",
	},
	{
		id: "a3",
		name: "Jordan Lee",
		recordLabel: "3-0 standing (4 games)",
		statusLabel: "2 MINS WAITING",
		status: "waiting",
	},
	{
		id: "a4",
		name: "John Smith",
		recordLabel: "0-2 standing (2 games)",
		statusLabel: "AWAY (EATING)",
		status: "away",
		disabled: true,
	},
];
