"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_SESSION_DISCOVERY } from "@/constants/mock-session-discovery";
import type { SessionDiscoveryItem } from "@/types/session-discovery";
import { SessionListView } from "./SessionListView";

const mockSessions: SessionDiscoveryItem[] = MOCK_SESSION_DISCOVERY.map(
	(session) => ({ ...session, distanceKm: 1.2 }),
);

const meta: Meta<typeof SessionListView> = {
	title: "dashboard/SessionListView",
	component: SessionListView,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="relative h-[640px] w-full overflow-hidden bg-bg-base">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SessionListView>;

const noop = () => {};

export const WithSessions: Story = {
	args: {
		sessions: mockSessions,
		onJoinSession: noop,
	},
};

export const Empty: Story = {
	args: {
		sessions: [],
		onAdjustFilters: noop,
	},
};

export const Loading: Story = {
	args: {
		sessions: [],
		isLoading: true,
	},
};
