import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_STANDING_FULL } from "@/constants/mock-session-ui";

import { SessionStandingView } from "./SessionStandingView";

const meta: Meta<typeof SessionStandingView> = {
	title: "session/SessionStandingView",
	component: SessionStandingView,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionStandingView>;

export const Default: Story = {
	args: { rows: MOCK_STANDING_FULL },
};

export const FewRows: Story = {
	args: {
		rows: MOCK_STANDING_FULL.slice(0, 3),
		title: "Top players",
	},
};
