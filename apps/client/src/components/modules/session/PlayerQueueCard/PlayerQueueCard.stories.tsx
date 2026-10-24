import type { Meta, StoryObj } from "@storybook/react";

import {
	MOCK_ROSTER,
	type PlayerQueueCardData,
} from "@/constants/mock-session-ui";

import { PlayerQueueCard } from "./PlayerQueueCard";

const FALLBACK_PLAYER: PlayerQueueCardData = {
	id: "p-fallback",
	name: "Fallback Player",
	recordLabel: "0-0 standing (0 games)",
	statusLabel: "Ready",
	status: "ready",
};

const waitingPlayer: PlayerQueueCardData = MOCK_ROSTER[0] ?? FALLBACK_PLAYER;
const playingPlayer: PlayerQueueCardData = MOCK_ROSTER[1] ?? FALLBACK_PLAYER;
const awayPlayer: PlayerQueueCardData = MOCK_ROSTER[3] ?? FALLBACK_PLAYER;
const readyPlayer: PlayerQueueCardData = MOCK_ROSTER[4] ?? FALLBACK_PLAYER;

const meta: Meta<typeof PlayerQueueCard> = {
	title: "session/PlayerQueueCard",
	component: PlayerQueueCard,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PlayerQueueCard>;

export const Waiting: Story = {
	args: { player: waitingPlayer },
};

export const Playing: Story = {
	args: { player: playingPlayer },
};

export const AwayDisabled: Story = {
	args: { player: awayPlayer },
};

export const Selected: Story = {
	args: { player: waitingPlayer, selected: true, onClick: () => {} },
};

export const Ready: Story = {
	args: { player: readyPlayer },
};
