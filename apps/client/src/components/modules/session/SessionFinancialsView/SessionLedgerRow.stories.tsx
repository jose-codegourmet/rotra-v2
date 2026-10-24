import type { Meta, StoryObj } from "@storybook/react";

import { type LedgerRow, MOCK_LEDGER } from "@/constants/mock-session-ui";

import { SessionLedgerRow } from "./SessionFinancialsView";

const FALLBACK_LEDGER_ROW: LedgerRow = {
	id: "l-fallback",
	name: "Fallback Player",
	games: 0,
	timeRange: "N/A",
	payment: "pending",
};

const paidRow: LedgerRow = MOCK_LEDGER[0] ?? FALLBACK_LEDGER_ROW;
const pendingRow: LedgerRow = MOCK_LEDGER[1] ?? FALLBACK_LEDGER_ROW;
const partialRow: LedgerRow = MOCK_LEDGER[3] ?? FALLBACK_LEDGER_ROW;

const meta: Meta<typeof SessionLedgerRow> = {
	title: "session/SessionLedgerRow",
	component: SessionLedgerRow,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionLedgerRow>;

export const Paid: Story = {
	args: { row: paidRow },
};

export const Pending: Story = {
	args: { row: pendingRow },
};

export const Partial: Story = {
	args: { row: partialRow },
};
