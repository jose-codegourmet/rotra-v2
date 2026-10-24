import type { Meta, StoryObj } from "@storybook/react";

import { ProfileRightColumnSkeleton } from "./ProfileRightColumnSkeleton";

const meta: Meta<typeof ProfileRightColumnSkeleton> = {
	title: "profile/ProfileRightColumnSkeleton",
	component: ProfileRightColumnSkeleton,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ProfileRightColumnSkeleton>;

export const Default: Story = {};

export const MainColumn: Story = {
	render: () => (
		<div className="flex-1 max-w-4xl">
			<ProfileRightColumnSkeleton />
		</div>
	),
};
