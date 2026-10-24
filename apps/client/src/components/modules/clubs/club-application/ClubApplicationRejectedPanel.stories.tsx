import type { Meta, StoryObj } from "@storybook/react";

import { ClubApplicationRejectedPanel } from "./ClubApplicationRejectedPanel";

const meta: Meta<typeof ClubApplicationRejectedPanel> = {
	title: "modules/clubs/ClubApplicationRejectedPanel",
	component: ClubApplicationRejectedPanel,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClubApplicationRejectedPanel>;

const lastRejected = {
	id: "app-2",
	playerId: "player-1",
	clubName: "Duplicate Name FC",
	description: "Desc",
	intent: "Intent",
	locationCity: "Manila",
	locationVenue: "Hall",
	venueAddress: "Addr",
	facebookPageUrl: null,
	facebookProfileUrl: null,
	contactNumber: null,
	expectedPlayerCount: "eleven_to_twentyfive" as const,
	additionalNotes: null,
	status: "rejected" as const,
	rejectionReason: "insufficient_information",
	reviewNote: "Please add venue photos.",
	reviewedById: null,
	reviewedAt: new Date().toISOString(),
	resultingClubId: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

export const Default: Story = {
	args: {
		lastRejected,
		onApplyAgain: () => {},
	},
};
