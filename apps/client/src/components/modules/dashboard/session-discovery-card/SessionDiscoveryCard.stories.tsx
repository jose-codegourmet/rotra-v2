"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_SESSION_DISCOVERY } from "@/constants/mock-session-discovery";
import type { SessionDiscoveryItem } from "@/types/session-discovery";
import { SessionDiscoveryCard } from "./SessionDiscoveryCard";

function findMockSession(id: string): SessionDiscoveryItem {
	const session = MOCK_SESSION_DISCOVERY.find((item) => item.id === id);
	if (!session) throw new Error(`Missing mock session: ${id}`);
	return { ...session, distanceKm: 1.2 };
}

const liveSession = findMockSession("sess-mandaue-live");
const upcomingSession = findMockSession("sess-lapulapu-open");
const openSession: SessionDiscoveryItem = {
	...findMockSession("sess-sunrise-today"),
	dateTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
	status: "open",
};

const meta: Meta<typeof SessionDiscoveryCard> = {
	title: "dashboard/SessionDiscoveryCard",
	component: SessionDiscoveryCard,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="mx-auto w-full max-w-md bg-bg-surface p-6">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SessionDiscoveryCard>;

const noop = () => {};

export const CompactLive: Story = {
	args: {
		session: liveSession,
		variant: "compact",
		compactLayout: "full",
		showAvatars: true,
		onJoin: noop,
	},
};

export const CompactOpen: Story = {
	args: {
		session: openSession,
		variant: "compact",
		compactLayout: "row",
		onJoin: noop,
	},
};

export const CompactUpcoming: Story = {
	args: {
		session: upcomingSession,
		variant: "compact",
		compactLayout: "row",
		onJoin: noop,
	},
};

export const ListLive: Story = {
	args: {
		session: liveSession,
		variant: "list",
		onJoin: noop,
	},
};

export const ListOpen: Story = {
	args: {
		session: openSession,
		variant: "list",
		onJoin: noop,
	},
};

export const ListUpcoming: Story = {
	args: {
		session: upcomingSession,
		variant: "list",
		onJoin: noop,
	},
};

export const GridLive: Story = {
	args: {
		session: liveSession,
		variant: "grid",
		onJoin: noop,
	},
};

export const GridOpen: Story = {
	args: {
		session: openSession,
		variant: "grid",
		onJoin: noop,
	},
};

export const GridUpcoming: Story = {
	args: {
		session: upcomingSession,
		variant: "grid",
		onJoin: noop,
	},
};

export const ListOwned: Story = {
	args: {
		session: { ...upcomingSession, isOwner: true },
		variant: "list",
		onJoin: noop,
	},
};
