"use client";

import type { Meta, StoryObj } from "@storybook/react";
import {
	buildMultiSessionGroup,
	MOCK_MULTI_THREE_GROUP,
	MOCK_SINGLE_UPCOMING_GROUP,
} from "@/constants/mock-venue-groups";
import { VenueSessionsModal } from "./VenueSessionsModal";

const meta: Meta<typeof VenueSessionsModal> = {
	title: "dashboard/VenueSessionsModal",
	component: VenueSessionsModal,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="relative min-h-[520px] bg-bg-base">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof VenueSessionsModal>;

const noop = () => {};

export const ThreeSessions: Story = {
	args: {
		group: MOCK_MULTI_THREE_GROUP,
		open: true,
		onOpenChange: noop,
		onJoin: noop,
	},
};

export const FiveSessions: Story = {
	args: {
		group: buildMultiSessionGroup(5),
		open: true,
		onOpenChange: noop,
		onJoin: noop,
	},
};

export const SingleSession: Story = {
	args: {
		group: MOCK_SINGLE_UPCOMING_GROUP,
		open: true,
		onOpenChange: noop,
		onJoin: noop,
	},
};
