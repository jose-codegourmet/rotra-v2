import type { Meta, StoryObj } from "@storybook/react";

import { KpiCard } from "./KpiCard";

const meta: Meta<typeof KpiCard> = {
	title: "session/KpiCard",
	component: KpiCard,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {
	args: {
		label: "Total matches",
		value: "142",
		hint: "+12%",
	},
};

export const NoHint: Story = {
	args: {
		label: "Active players",
		value: "36",
	},
};
