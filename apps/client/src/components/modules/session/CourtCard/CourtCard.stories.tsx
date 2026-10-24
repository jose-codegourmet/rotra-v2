import type { Meta, StoryObj } from "@storybook/react";

import { type CourtCardData, MOCK_COURTS } from "@/constants/mock-session-ui";

import { CourtCard } from "./CourtCard";

const FALLBACK_COURT: CourtCardData = {
	id: "c-fallback",
	label: "Court 00",
	variant: "empty",
};

const activeCourt: CourtCardData = MOCK_COURTS[0] ?? FALLBACK_COURT;
const activeTrainingCourt: CourtCardData = MOCK_COURTS[2] ?? FALLBACK_COURT;
const emptyCourt: CourtCardData = MOCK_COURTS[3] ?? FALLBACK_COURT;

const meta: Meta<typeof CourtCard> = {
	title: "session/CourtCard",
	component: CourtCard,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CourtCard>;

export const Active: Story = {
	args: {
		court: activeCourt,
	},
};

export const ActiveTraining: Story = {
	args: {
		court: activeTrainingCourt,
	},
};

export const Empty: Story = {
	args: {
		court: emptyCourt,
	},
};
