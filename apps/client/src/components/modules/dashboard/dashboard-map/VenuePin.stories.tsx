"use client";

import type { Meta, StoryObj } from "@storybook/react";
import {
	buildMultiSessionGroup,
	MOCK_FULL_GROUP,
	MOCK_MULTI_THREE_GROUP,
	MOCK_SINGLE_LIVE_GROUP,
	MOCK_SINGLE_UPCOMING_GROUP,
} from "@/constants/mock-venue-groups";
import { VenuePinVisual } from "./VenuePin";

const meta: Meta<typeof VenuePinVisual> = {
	title: "dashboard/VenuePin",
	component: VenuePinVisual,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="flex min-h-[160px] items-end justify-center bg-bg-base p-8">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof VenuePinVisual>;

export const SingleLive: Story = {
	args: {
		group: MOCK_SINGLE_LIVE_GROUP,
		isSelected: false,
	},
};

export const SingleUpcoming: Story = {
	args: {
		group: MOCK_SINGLE_UPCOMING_GROUP,
		isSelected: false,
	},
};

export const MultiThree: Story = {
	args: {
		group: MOCK_MULTI_THREE_GROUP,
		isSelected: false,
	},
};

export const MultiSix: Story = {
	args: {
		group: buildMultiSessionGroup(6),
		isSelected: false,
	},
};

export const FullMuted: Story = {
	args: {
		group: MOCK_FULL_GROUP,
		isSelected: false,
	},
};

export const Selected: Story = {
	args: {
		group: MOCK_SINGLE_LIVE_GROUP,
		isSelected: true,
	},
};
