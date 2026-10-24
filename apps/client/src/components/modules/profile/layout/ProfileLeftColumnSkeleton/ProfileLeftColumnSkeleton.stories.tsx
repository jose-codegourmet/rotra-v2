import type { Meta, StoryObj } from "@storybook/react";

import { ProfileLeftColumnSkeleton } from "./ProfileLeftColumnSkeleton";

const meta: Meta<typeof ProfileLeftColumnSkeleton> = {
	title: "profile/ProfileLeftColumnSkeleton",
	component: ProfileLeftColumnSkeleton,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ProfileLeftColumnSkeleton>;

export const Default: Story = {};

export const NarrowColumn: Story = {
	render: () => (
		<div className="lg:w-[35%] max-w-full">
			<ProfileLeftColumnSkeleton />
		</div>
	),
};
