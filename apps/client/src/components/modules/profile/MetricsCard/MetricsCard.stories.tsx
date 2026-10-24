import type { Meta, StoryObj } from "@storybook/react";

import { MetricsCard } from "./MetricsCard";

const meta: Meta<typeof MetricsCard> = {
	title: "profile/MetricsCard",
	component: MetricsCard,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MetricsCard>;

export const Default: Story = {};
