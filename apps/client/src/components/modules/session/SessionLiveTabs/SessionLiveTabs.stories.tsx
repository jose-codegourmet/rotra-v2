import type { Meta, StoryObj } from "@storybook/react";

import { SessionLiveTabs } from "./SessionLiveTabs";

const meta: Meta<typeof SessionLiveTabs> = {
	title: "session/SessionLiveTabs",
	component: SessionLiveTabs,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<div className="min-h-screen bg-bg-base p-4 md:p-8 max-w-[1200px] mx-auto">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SessionLiveTabs>;

export const Default: Story = {
	args: {
		sessionLabel: "Sunrise badminton · Hall B",
	},
};

export const WithHint: Story = {
	render: function Render() {
		return (
			<div className="relative">
				<p className="text-small text-text-secondary mb-4">
					Open the assign flow from an empty court card (“Add queue / players”).
				</p>
				<SessionLiveTabs sessionLabel="Demo" />
			</div>
		);
	},
};
