import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_PLAYER_COURTS_COPY } from "@/constants/mock-player-session";
import { PlayerSessionShell } from "./PlayerSessionShell";

const meta: Meta<typeof PlayerSessionShell> = {
	title: "session/PlayerSessionShell",
	component: PlayerSessionShell,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof PlayerSessionShell>;

export const CourtsTab: Story = {
	args: {
		activeTab: "courts",
		eyebrow: MOCK_PLAYER_COURTS_COPY.eyebrow,
		headline: MOCK_PLAYER_COURTS_COPY.headline,
		subLine: MOCK_PLAYER_COURTS_COPY.subLine,
		children: (
			<p className="text-small text-text-secondary">Courts content slot.</p>
		),
	},
};
