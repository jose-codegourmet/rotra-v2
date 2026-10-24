import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_SESSION_JOIN,
	MOCK_SESSION_JOIN_META,
	MOCK_SESSION_JOIN_QUEUE,
} from "@/constants/mock-session-join";
import { SessionJoinView } from "./SessionJoinView";

const meta: Meta<typeof SessionJoinView> = {
	title: "session/SessionJoinView",
	component: SessionJoinView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SessionJoinView>;

export const Default: Story = {
	args: {
		session: MOCK_SESSION_JOIN,
		meta: MOCK_SESSION_JOIN_META,
		queue: MOCK_SESSION_JOIN_QUEUE,
		joinedHref: "/sessions/joined",
	},
};
