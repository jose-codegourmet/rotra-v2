import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_SESSION_COURT,
	MOCK_SESSION_COURTS,
} from "@/constants/mock-session-court";
import { SessionCourtView } from "./SessionCourtView";

const meta: Meta<typeof SessionCourtView> = {
	title: "session/SessionCourtView",
	component: SessionCourtView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SessionCourtView>;

export const Default: Story = {
	args: {
		session: MOCK_SESSION_COURT,
		courts: MOCK_SESSION_COURTS,
		initialHeld: false,
	},
};

export const Court1OnHold: Story = {
	args: {
		session: MOCK_SESSION_COURT,
		courts: MOCK_SESSION_COURTS,
		initialHeld: true,
	},
};
