export type AddMatchPlayer = {
	id: string;
	name: string;
	initials: string;
	waitLabel: string;
	selected: boolean;
};

export type AddMatchTeamSlot = {
	id: string;
	name: string;
	initials: string;
} | null;

export const MOCK_SESSION_ADD_MATCH = {
	roleBadge: "QUE MASTER",
	eyebrow: "COURT 2 FREE",
	headline: "Add match",
	subLine: "Smash Hub Ortigas · Doubles · Court 2 free",
	teamALabel: "TEAM A",
	teamBLabel: "TEAM B",
	vsLabel: "vs",
	openSlotLabel: "Open",
	waitingLabel: "WAITING",
	waitingHint: "Longest wait first",
	selectedCount: 2,
	slotCount: 4,
	ctaLabel: "ADD MATCH",
	addToast: "Match added.",
} as const;

export type SessionAddMatchFixture = typeof MOCK_SESSION_ADD_MATCH;

export const MOCK_ADD_MATCH_TEAM_A: AddMatchTeamSlot[] = [
	{ id: "nico-cruz", name: "Nico Cruz", initials: "NC" },
	null,
];

export const MOCK_ADD_MATCH_TEAM_B: AddMatchTeamSlot[] = [
	{ id: "bea-ong", name: "Bea Ong", initials: "BO" },
	null,
];

export const MOCK_ADD_MATCH_POOL: AddMatchPlayer[] = [
	{
		id: "nico-cruz",
		name: "Nico Cruz",
		initials: "NC",
		waitLabel: "22 min wait",
		selected: true,
	},
	{
		id: "bea-ong",
		name: "Bea Ong",
		initials: "BO",
		waitLabel: "19 min wait",
		selected: true,
	},
	{
		id: "eli-park",
		name: "Eli Park",
		initials: "EP",
		waitLabel: "16 min wait",
		selected: false,
	},
	{
		id: "sam-cruz",
		name: "Sam Cruz",
		initials: "SC",
		waitLabel: "12 min wait",
		selected: false,
	},
	{
		id: "ana-dela-cruz",
		name: "Ana Dela Cruz",
		initials: "AD",
		waitLabel: "9 min wait",
		selected: false,
	},
];
