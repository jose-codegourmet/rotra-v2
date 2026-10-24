import type { MockMembershipStatus } from "./club-demo-role";

export type ClubMemberRole = "owner" | "que_master" | "player";

export type ClubMemberRow = {
	id: string;
	name: string;
	email: string;
	role: ClubMemberRole;
	joinedAt: string;
};

export type ManageMemberRow = ClubMemberRow & {
	status: "active" | "inactive";
	matchesManaged: number;
};

export type ClubRuleSection = {
	title: string;
	body: string;
};

export type ClubVenue = {
	name: string;
	address: string;
	note?: string;
	timeWindows?: string;
};

export type ClubAnnouncement = {
	id: string;
	title: string;
	body: string;
	date: string;
};

export const MOCK_CLUB = {
	id: "1",
	name: "Sunrise Badminton Club",
	location: "Quezon City",
	status: "Active",
	founded: "January 2024",
	mission:
		"Elevating the standard of local competitive play through structured rotational queues, fair scoring, and a welcoming community.",
	description:
		"We're a competitive-social club focused on doubles rotational badminton. Open to all levels. We run weekly sessions with structured queuing managed by dedicated Que Masters.",
	stats: {
		members: 24,
		queMasters: 3,
		sessions: 12,
	},
	members: ["A", "M", "J", "R", "C"],
	totalMembers: 24,
	upcomingSessions: [
		{
			id: "s1",
			date: "Saturday, Apr 12",
			time: "8:00 AM",
			venue: "Hall B",
			slots: 12,
			total: 16,
		},
		{
			id: "s2",
			date: "Saturday, Apr 19",
			time: "8:00 AM",
			venue: "Hall B",
			slots: 8,
			total: 16,
		},
	],
	owner: { name: "Jose Buctuanon", initials: "JB" },
	membershipStatus: "not-member" as MockMembershipStatus,
	/** When false, member invite sidebar can show “disabled by club” (toggle lives in /manage later). */
	inviteLinkEnabled: true,
	mockInviteUrl: "https://rotra.app/join/sunrise-demo",
	scheduleSummary:
		"Weekly prime sessions Saturday mornings; competitive MMR blocks Thursday evenings.",
	venues: [
		{
			name: "Sunrise Arena — Hall B",
			address: "Downtown Sports Complex, Hall 4, Quezon City",
			timeWindows: "Sat 8:00–12:00 · Thu 19:00–21:00",
			note: "Courts 1–4 reserved for club queue.",
		},
		{
			name: "Annex Courts",
			address: "Same complex, Annex Wing",
			timeWindows: "Sun 7:00–10:00",
		},
	] satisfies ClubVenue[],
	rules: [
		{
			title: "Code of conduct",
			body: "Respect all players and officials. Zero tolerance for harassment.",
		},
		{
			title: "Punctuality",
			body: "Arrive 10 minutes before your block. Late arrivals may forfeit queue position.",
		},
		{
			title: "Rotational queue",
			body: "Follow Que Master instructions. No skipping without QM approval.",
		},
	] satisfies ClubRuleSection[],
	announcements: [
		{
			id: "a1",
			title: "Mixed doubles open — Apr 20",
			body: "Sign-ups open on the announcements board. QM on duty: Alex.",
			date: "Apr 8, 2026",
		},
		{
			id: "a2",
			title: "Shuttle quality upgrade",
			body: "We are trialing tournament-grade shuttles for MMR sessions this month.",
			date: "Apr 1, 2026",
		},
	] satisfies ClubAnnouncement[],
	tags: ["Competitive", "Daily training", "Elite coaching"],
} as const;

export const MOCK_CLUB_MEMBER_ROWS: ClubMemberRow[] = [
	{
		id: "m0",
		name: "Jose Buctuanon",
		email: "jose@example.com",
		role: "owner",
		joinedAt: "Jan 2024",
	},
	{
		id: "m1",
		name: "Alex Santos",
		email: "alex@example.com",
		role: "que_master",
		joinedAt: "Mar 2024",
	},
	{
		id: "m2",
		name: "Rina Cruz",
		email: "rina@example.com",
		role: "que_master",
		joinedAt: "Apr 2024",
	},
	{
		id: "m3",
		name: "Sam Lee",
		email: "sam@example.com",
		role: "que_master",
		joinedAt: "May 2024",
	},
	{
		id: "m4",
		name: "Jordan Kim",
		email: "jordan@example.com",
		role: "player",
		joinedAt: "Jun 2024",
	},
	{
		id: "m5",
		name: "Taylor Nguyen",
		email: "taylor@example.com",
		role: "player",
		joinedAt: "Jun 2024",
	},
	{
		id: "m6",
		name: "Casey Rivera",
		email: "casey@example.com",
		role: "player",
		joinedAt: "Jul 2024",
	},
	{
		id: "m7",
		name: "Morgan Patel",
		email: "morgan@example.com",
		role: "player",
		joinedAt: "Aug 2024",
	},
];

export const MOCK_MANAGE_MEMBER_ROWS: ManageMemberRow[] =
	MOCK_CLUB_MEMBER_ROWS.map((row, i) => ({
		...row,
		status: i === 5 ? "inactive" : "active",
		matchesManaged: 200 + i * 140,
	}));

/** Owner + all Que Masters + first 3 players (for non-member /members). */
export function getPublicMemberPreview(rows: ClubMemberRow[]): ClubMemberRow[] {
	const owners = rows.filter((r) => r.role === "owner");
	const qms = rows.filter((r) => r.role === "que_master");
	const players = rows.filter((r) => r.role === "player");
	return [...owners, ...qms, ...players.slice(0, 3)];
}
