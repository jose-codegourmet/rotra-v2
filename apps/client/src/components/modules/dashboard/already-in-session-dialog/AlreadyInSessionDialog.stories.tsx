"use client";

import type { Meta, StoryObj } from "@storybook/react";
import type { ActiveSessionSummary } from "@/types/session-discovery";
import { AlreadyInSessionDialog } from "./AlreadyInSessionDialog";

const activeSession: ActiveSessionSummary = {
	sessionId: "session-active-1",
	title: "Friday Night Doubles",
	isOwner: false,
	clubName: "Sunrise Badminton Club",
	location: "Hall B",
	dateTime: new Date().toISOString(),
	status: "open",
	playerStatus: "waiting",
	admissionStatus: "accepted",
	courtHint: "Up next",
	href: "/find-sessions/session-active-1",
};

const scheduledSession: ActiveSessionSummary = {
	sessionId: "session-scheduled-1",
	title: "Sunday Morning Games",
	isOwner: true,
	clubName: "Metro Badminton Center",
	location: "Court 1",
	dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
	status: "open",
	playerStatus: "not_arrived",
	admissionStatus: "accepted",
	courtHint: null,
	href: "/find-sessions/session-scheduled-1",
};

const meta: Meta<typeof AlreadyInSessionDialog> = {
	title: "dashboard/AlreadyInSessionDialog",
	component: AlreadyInSessionDialog,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AlreadyInSessionDialog>;

const noop = () => {};

export const Open: Story = {
	args: {
		open: true,
		onOpenChange: noop,
		activeSession,
		onGoToSession: noop,
	},
};

export const ScheduledEnrollment: Story = {
	args: {
		open: true,
		onOpenChange: noop,
		activeSession: scheduledSession,
		onGoToSession: noop,
	},
};
