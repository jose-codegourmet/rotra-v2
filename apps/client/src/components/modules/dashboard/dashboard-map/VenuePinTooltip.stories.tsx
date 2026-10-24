"use client";

import type { Meta, StoryObj } from "@storybook/react";
import {
	buildMultiSessionGroup,
	MOCK_AVATAR_OVERFLOW_GROUP,
	MOCK_EMPTY_PLAYERS_GROUP,
	MOCK_MULTI_THREE_GROUP,
	MOCK_SINGLE_UPCOMING_GROUP,
} from "@/constants/mock-venue-groups";
import { VenuePinTooltip } from "./VenuePinTooltip";

const meta: Meta<typeof VenuePinTooltip> = {
	title: "dashboard/VenuePinTooltip",
	component: VenuePinTooltip,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="flex min-h-[420px] items-start justify-center bg-bg-base p-8">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof VenuePinTooltip>;

const noop = () => {};

export const SingleSession: Story = {
	args: {
		group: MOCK_SINGLE_UPCOMING_GROUP,
		onJoin: noop,
		onOpenModal: noop,
	},
};

export const TwoSessions: Story = {
	args: {
		group: {
			...MOCK_MULTI_THREE_GROUP,
			sessions: MOCK_MULTI_THREE_GROUP.sessions.slice(0, 2),
		},
		onJoin: noop,
		onOpenModal: noop,
	},
};

export const SeeMoreVisible: Story = {
	args: {
		group: buildMultiSessionGroup(5),
		onJoin: noop,
		onOpenModal: noop,
	},
};

export const AvatarStackOverflow: Story = {
	args: {
		group: MOCK_AVATAR_OVERFLOW_GROUP,
		onJoin: noop,
		onOpenModal: noop,
	},
};

export const EmptyBeFirst: Story = {
	args: {
		group: MOCK_EMPTY_PLAYERS_GROUP,
		onJoin: noop,
		onOpenModal: noop,
	},
};
