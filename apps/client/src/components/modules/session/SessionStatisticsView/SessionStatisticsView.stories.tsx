import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_CHART_POINTS, MOCK_KPIS } from "@/constants/mock-session-ui";

import { SessionStatisticsView } from "./SessionStatisticsView";

const meta: Meta<typeof SessionStatisticsView> = {
	title: "session/SessionStatisticsView",
	component: SessionStatisticsView,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionStatisticsView>;

export const Default: Story = {
	args: {
		kpis: [...MOCK_KPIS],
		chartData: MOCK_CHART_POINTS,
	},
};

export const MinimalKpis: Story = {
	args: {
		kpis: [MOCK_KPIS[0], MOCK_KPIS[1]],
		chartData: MOCK_CHART_POINTS.slice(0, 5),
		title: "Session stats",
	},
};
