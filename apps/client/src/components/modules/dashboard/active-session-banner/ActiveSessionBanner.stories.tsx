"use client";

import type { Meta, StoryObj } from "@storybook/react";
import type { ActiveSessionSummary } from "@/types/session-discovery";
import { ActiveSessionBanner } from "./ActiveSessionBanner";

const liveSession: ActiveSessionSummary = {
	sessionId: "session-live-1",
	title: "Saturday Smash",
	isOwner: false,
	clubName: "Sunrise Badminton Club",
	location: "Hall B",
	dateTime: new Date().toISOString(),
	status: "active",
	playerStatus: "playing",
	admissionStatus: "accepted",
	courtHint: "On court",
	href: "/find-sessions/session-live-1",
};

const queueSession: ActiveSessionSummary = {
	sessionId: "session-queue-1",
	title: "Evening Queue",
	isOwner: true,
	clubName: "Metro Badminton Center",
	location: "Court 3",
	dateTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
	status: "open",
	playerStatus: "waiting",
	admissionStatus: "accepted",
	courtHint: "Up next",
	href: "/find-sessions/session-queue-1",
};

const meta: Meta<typeof ActiveSessionBanner> = {
	title: "dashboard/ActiveSessionBanner",
	component: ActiveSessionBanner,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="relative min-h-[120px] bg-bg-base p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ActiveSessionBanner>;

const noop = () => {};

export const LiveActive: Story = {
	args: {
		session: liveSession,
		onNavigate: noop,
	},
};

export const InQueue: Story = {
	args: {
		session: queueSession,
		onNavigate: noop,
	},
};
