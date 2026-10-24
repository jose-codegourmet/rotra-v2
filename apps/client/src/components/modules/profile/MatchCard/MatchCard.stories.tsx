import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_PLAYER } from "@/constants/mock-player";

import { type Match, MatchCard } from "./MatchCard";

const FALLBACK_MATCH: Match = {
	id: "m-fallback",
	date: "2024-10-10",
	result: "W",
	resultLabel: "Victory",
	yourTeam: "Alex S. / Jamie L.",
	yourTeamLabel: "Your Team",
	opponents: "Marcus D. / Tiana W.",
	opponentsLabel: "Opponents",
	score: "21 - 18",
	club: "City Badminton Club",
};

const victoryMatch: Match = MOCK_PLAYER.recentMatches[0] ?? FALLBACK_MATCH;
const defeatMatch: Match = MOCK_PLAYER.recentMatches[1] ?? FALLBACK_MATCH;
const singlesVictoryMatch: Match =
	MOCK_PLAYER.recentMatches[2] ?? FALLBACK_MATCH;

const meta: Meta<typeof MatchCard> = {
	title: "profile/MatchCard",
	component: MatchCard,
	tags: ["autodocs"],
	argTypes: {
		match: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof MatchCard>;

export const Victory: Story = {
	args: {
		match: victoryMatch,
	},
};

export const Defeat: Story = {
	args: {
		match: defeatMatch,
	},
};

export const SinglesVictory: Story = {
	args: {
		match: singlesVictoryMatch,
	},
};

export const CloseGame: Story = {
	args: {
		match: {
			id: "m-close",
			date: "2024-11-05",
			result: "W",
			resultLabel: "Victory",
			yourTeam: "Alex S. / Jamie L.",
			yourTeamLabel: "Your Team",
			opponents: "Marcus D. / Tiana W.",
			opponentsLabel: "Opponents",
			score: "22 – 20",
			club: "City Badminton Club",
		},
	},
};
