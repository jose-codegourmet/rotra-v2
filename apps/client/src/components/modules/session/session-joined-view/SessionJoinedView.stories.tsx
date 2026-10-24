import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_SESSION_JOIN,
	MOCK_SESSION_JOINED_QUEUE,
} from "@/constants/mock-session-join";
import { SessionJoinedView } from "./SessionJoinedView";

const meta: Meta<typeof SessionJoinedView> = {
	title: "session/SessionJoinedView",
	component: SessionJoinedView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SessionJoinedView>;

export const Default: Story = {
	args: {
		session: MOCK_SESSION_JOIN,
		queue: MOCK_SESSION_JOINED_QUEUE,
	},
};
