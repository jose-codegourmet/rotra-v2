export type TPlayerModel = {
	id: string;
	name: string;
	level: string;
	tier: string;
	tierPips: {
		filled: number;
		total: number;
	};
	exp: number;
	initials: string;
	skillOverall: number;
	stats: Array<{
		label: string;
		value: string;
		sub?: string;
		accent?: boolean;
	}>;
	playStyle: string[];
	gear: Array<{
		category: string;
		items: Array<{
			title: string;
			brand: string;
			model: string;
			specs: string[];
		}>;
	}>;
	recentMatches: Array<{
		id: string;
		date: string;
		result: "W" | "L";
		resultLabel: string;
		yourTeam: string;
		yourTeamLabel: string;
		opponents: string;
		opponentsLabel: string;
		score: string;
		club: string;
	}>;
};
