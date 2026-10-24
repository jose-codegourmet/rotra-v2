import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_SESSION_JOIN } from "@/constants/mock-session-join";
import { SessionCapacityCard } from "./SessionCapacityCard";

const meta: Meta<typeof SessionCapacityCard> = {
	title: "session/SessionCapacityCard",
	component: SessionCapacityCard,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionCapacityCard>;

export const Listing: Story = {
	args: {
		accepted: MOCK_SESSION_JOIN.listingAccepted,
		courts: MOCK_SESSION_JOIN.courts,
		playersPerCourt: MOCK_SESSION_JOIN.playersPerCourt,
		showSpotsOpen: true,
		footnote: MOCK_SESSION_JOIN.shareFootnote,
	},
};

export const Joined: Story = {
	args: {
		accepted: MOCK_SESSION_JOIN.joinedAccepted,
		courts: MOCK_SESSION_JOIN.courts,
		playersPerCourt: MOCK_SESSION_JOIN.playersPerCourt,
	},
};
