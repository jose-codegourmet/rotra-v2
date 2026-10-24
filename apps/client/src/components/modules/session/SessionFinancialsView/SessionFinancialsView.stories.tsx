import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_FINANCIAL_LINES, MOCK_LEDGER } from "@/constants/mock-session-ui";

import { SessionFinancialsView } from "./SessionFinancialsView";

const meta: Meta<typeof SessionFinancialsView> = {
	title: "session/SessionFinancialsView",
	component: SessionFinancialsView,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionFinancialsView>;

export const Default: Story = {
	args: {
		ledger: MOCK_LEDGER,
		lineItems: MOCK_FINANCIAL_LINES,
		totalCost: "$636.50",
		profit: "+$148.50",
	},
};

export const NarrowLedger: Story = {
	args: {
		ledger: MOCK_LEDGER.slice(0, 2),
		lineItems: MOCK_FINANCIAL_LINES.slice(0, 2),
		totalCost: "$400.00",
		profit: "+$80.00",
		subtitle: "8 active participants",
	},
};
