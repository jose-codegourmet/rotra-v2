import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_SESSION_JOIN } from "@/constants/mock-session-join";
import { SessionBrandHeader } from "./SessionBrandHeader";

const meta: Meta<typeof SessionBrandHeader> = {
	title: "session/SessionBrandHeader",
	component: SessionBrandHeader,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionBrandHeader>;

export const Listing: Story = {
	args: {
		status: MOCK_SESSION_JOIN.statusLine,
	},
};

export const Joined: Story = {
	args: {
		status: MOCK_SESSION_JOIN.joinedStatusLine,
	},
};
