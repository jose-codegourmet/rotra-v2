import type { TPlayerModel } from "@/types/player";

export const MOCK_PLAYER: TPlayerModel = {
	id: "u1",
	name: "Alex Santos",
	level: "Intermediate",
	tier: "Warrior 2",
	tierPips: { filled: 2, total: 5 },
	exp: 620,
	initials: "AS",
	skillOverall: 8.4,
	stats: [
		{ label: "Total Games", value: "248", sub: "+12 this month" },
		{ label: "Match Wins", value: "162", sub: "65% Ratio" },
		{ label: "Win Rate", value: "68%", accent: true, sub: "↑ Trending" },
		{ label: "Sessions", value: "124", sub: "3.2 avg/week" },
		{ label: "Clubs", value: "3", sub: "Active" },
		{ label: "Performance", value: "2,480", accent: true, sub: "Top 5%" },
	],
	playStyle: ["Aggressive Smasher", "Net Specialist", "Endurance Tank"],
	gear: [
		{
			category: "RACKETS",
			items: [
				{
					title: "Main Racket",
					brand: "Yonex",
					model: "Astrox 99 Pro",
					specs: ["Head Heavy", "BG80", "26 lbs"],
				},
			],
		},
		{
			category: "FOOTWEAR",
			items: [
				{
					title: "Court Shoes",
					brand: "Yonex",
					model: "Power Cushion 65 Z3",
					specs: ["Wide Fit", "Size 9.5"],
				},
			],
		},
		{ category: "BAGS", items: [] },
	],
	recentMatches: [
		{
			id: "m1",
			date: "2024-10-24",
			result: "W",
			resultLabel: "Victory",
			yourTeam: "Alex S. / Jamie L.",
			yourTeamLabel: "Your Team",
			opponents: "Marcus D. / Tiana W.",
			opponentsLabel: "Opponents",
			score: "21 – 18",
			club: "Premier Club",
		},
		{
			id: "m2",
			date: "2024-10-22",
			result: "L",
			resultLabel: "Defeat",
			yourTeam: "Alex S. / Simon K.",
			yourTeamLabel: "Your Team",
			opponents: "Elena R. / Ivan B.",
			opponentsLabel: "Opponents",
			score: "19 – 21",
			club: "Open Session",
		},
		{
			id: "m3",
			date: "2024-10-18",
			result: "W",
			resultLabel: "Victory",
			yourTeam: "Alex S. / Solo",
			yourTeamLabel: "Singles",
			opponents: "Dave P.",
			opponentsLabel: "Opponent",
			score: "21 – 12",
			club: "Kinetic Arena",
		},
	],
};

export const SKILL_RATINGS = [9.2, 8.5, 8.8, 7.8, 6.9, 8.1];

export const ADVANCED_STATS = [
	{ label: "Top Partner", value: "Jamie L. (88% WR)" },
	{ label: "Rival Player", value: "Ivan B. (42% WR)" },
	{ label: "Avg. Game Duration", value: "18.4 Minutes" },
	{ label: "Smash Efficiency", value: "74.2%" },
	{ label: "Net Point Ratio", value: "62.1%" },
	{ label: "Avg. Heart Rate", value: "158 BPM" },
];
