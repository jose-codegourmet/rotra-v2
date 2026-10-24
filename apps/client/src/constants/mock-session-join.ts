export type SessionQueueStatus = "accepted" | "waitlisted" | "reserved";

export type SessionQueuePlayer = {
	id: string;
	initials: string;
	name: string;
	subtitle: string;
	status: SessionQueueStatus;
	highlight?: boolean;
};

export type SessionJoinMetaCard = {
	id: string;
	label: string;
	value: string;
	icon: "calendar" | "clock" | "courts" | "format";
};

export const SESSION_QUEUE_STATUS_LABELS: Record<SessionQueueStatus, string> = {
	accepted: "ACCEPTED",
	waitlisted: "WAITLISTED",
	reserved: "RESERVED",
};

export const SESSION_JOIN_SHARE_PATH = "/sessions/join";

export const MOCK_SESSION_JOIN = {
	venue: "Smash Hub Ortigas",
	statusLine: "TONIGHT · OPEN",
	joinedStatusLine: "TONIGHT · OPEN · SMASH HUB ORTIGAS",
	windowLabel: "7:00—9:00 PM",
	headlineSub: "7:00—9:00 PM · 2 courts · Doubles",
	joinedSub: "You just joined an open session · 7:00—9:00 PM · Doubles",
	dateLabel: "Sun, Aug 23",
	courtsLabel: "2 · doubles",
	formatLabel: "4 per court",
	format: "doubles" as const,
	courts: 2,
	playersPerCourt: 4,
	listingAccepted: 5,
	joinedAccepted: 6,
	listingQueueSummary: "5 of 8 · extras waitlisted",
	joinedQueueSummary: "6 of 8 accepted",
	shareFootnote: "Share the join link",
	qrTitle: "Share join QR",
	qrDescription: "Scan to join. 6 of 8 accepted · extras waitlisted.",
	sharePath: SESSION_JOIN_SHARE_PATH,
	shareTitle: "Join this ROTRA session",
	shareText: "Scan to join Smash Hub Ortigas.",
} as const;

export type SessionJoinFixture = typeof MOCK_SESSION_JOIN;

export const MOCK_SESSION_JOIN_META: SessionJoinMetaCard[] = [
	{
		id: "date",
		label: "DATE",
		value: MOCK_SESSION_JOIN.dateLabel,
		icon: "calendar",
	},
	{
		id: "window",
		label: "WINDOW",
		value: MOCK_SESSION_JOIN.windowLabel,
		icon: "clock",
	},
	{
		id: "courts",
		label: "COURTS",
		value: MOCK_SESSION_JOIN.courtsLabel,
		icon: "courts",
	},
	{
		id: "format",
		label: "FORMAT",
		value: MOCK_SESSION_JOIN.formatLabel,
		icon: "format",
	},
];

export const MOCK_SESSION_JOIN_QUEUE: SessionQueuePlayer[] = [
	{
		id: "jae-lim",
		initials: "JL",
		name: "Jae Lim",
		subtitle: "Player · Court 1",
		status: "accepted",
	},
	{
		id: "nina-vela",
		initials: "NV",
		name: "Nina Vela",
		subtitle: "Waitlist · FIFO #1",
		status: "waitlisted",
	},
	{
		id: "omar-cruz",
		initials: "OC",
		name: "Omar Cruz",
		subtitle: "Reserved · QM hold",
		status: "reserved",
	},
];

export const MOCK_SESSION_JOINED_QUEUE: SessionQueuePlayer[] = [
	{
		id: "you",
		initials: "JO",
		name: "You",
		subtitle: "Player · Court 1",
		status: "accepted",
		highlight: true,
	},
	{
		id: "mia-reyes",
		initials: "MR",
		name: "Mia Reyes",
		subtitle: "Player · Court 1",
		status: "accepted",
	},
	{
		id: "nina-vela",
		initials: "NV",
		name: "Nina Vela",
		subtitle: "Waitlist · FIFO #1",
		status: "waitlisted",
	},
	{
		id: "omar-cruz",
		initials: "OC",
		name: "Omar Cruz",
		subtitle: "Reserved · QM hold",
		status: "reserved",
	},
];

export const SESSION_QUEUE_LEGEND = [
	{ id: "accepted", status: "accepted" as const, label: "ACCEPTED" },
	{
		id: "waitlisted",
		status: "waitlisted" as const,
		label: "WAITLISTED · FIFO",
	},
	{ id: "reserved", status: "reserved" as const, label: "RESERVED · QM HOLD" },
];
