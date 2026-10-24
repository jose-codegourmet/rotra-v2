import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_STANDING_MINI } from "@/constants/mock-session-ui";

import { StandingMiniTable } from "./StandingMiniTable";

const meta: Meta<typeof StandingMiniTable> = {
	title: "session/StandingMiniTable",
	component: StandingMiniTable,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StandingMiniTable>;

export const Default: Story = {
	args: { rows: MOCK_STANDING_MINI },
};

export const Empty: Story = {
	args: { rows: [] },
};
