export type CourtViewStatus = "active" | "empty" | "onHold";

export type CourtViewSide = {
	label: string;
	players: readonly string[];
};

export type CourtViewCourt = {
	id: string;
	name: string;
	status: CourtViewStatus;
	teamA?: CourtViewSide;
	teamB?: CourtViewSide;
	score?: string;
	elapsed?: string;
	emptyMessage?: string;
};

export const COURT_1_ID = "court-1";

export const COURT_VIEW_STATUS_LABELS: Record<CourtViewStatus, string> = {
	active: "ACTIVE",
	empty: "EMPTY",
	onHold: "ON HOLD",
};

export const COURT_VIEW_STATUS_LEGEND: readonly {
	id: CourtViewStatus;
	label: string;
}[] = [
	{ id: "active", label: "ACTIVE" },
	{ id: "empty", label: "EMPTY" },
	{ id: "onHold", label: "ON HOLD" },
];

export const MOCK_SESSION_COURT = {
	venue: "Smash Hub Ortigas",
	headline: "Court view",
	windowLabel: "7:00—9:00 PM",
	formatLabel: "Doubles",
	subLine: "Smash Hub Ortigas • 7:00—9:00 PM • Doubles",
	liveCourtSingular: "LIVE COURT",
	liveCourtPlural: "LIVE COURTS",
	statusLegendLabel: "STATUS",
	emptyMessage: "No match on this court. It's free for the next pairing.",
	holdCta: "HOLD COURT 1",
	resumeCta: "RESUME COURT 1",
	holdToast: "Court 1 is on hold.",
	resumeToast: "Court 1 is active.",
} as const;

export type SessionCourtFixture = typeof MOCK_SESSION_COURT;

export const MOCK_SESSION_COURTS: CourtViewCourt[] = [
	{
		id: COURT_1_ID,
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
		emptyMessage: MOCK_SESSION_COURT.emptyMessage,
	},
];
