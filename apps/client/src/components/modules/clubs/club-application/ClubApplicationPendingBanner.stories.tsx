import type { Meta, StoryObj } from "@storybook/react";

import { ClubApplicationPendingBanner } from "./ClubApplicationPendingBanner";

const meta: Meta<typeof ClubApplicationPendingBanner> = {
	title: "modules/clubs/ClubApplicationPendingBanner",
	component: ClubApplicationPendingBanner,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClubApplicationPendingBanner>;

const pending = {
	id: "app-1",
	playerId: "player-1",
	clubName: "North Court Club",
	description: "Community doubles.",
	intent: "Grow local scene.",
	locationCity: "Cebu",
	locationVenue: "Sports Hub",
	venueAddress: "123 Main St",
	facebookPageUrl: null,
	facebookProfileUrl: null,
	contactNumber: null,
	expectedPlayerCount: "one_to_ten" as const,
	additionalNotes: null,
	status: "pending" as const,
	rejectionReason: null,
	reviewNote: null,
	reviewedById: null,
	reviewedAt: null,
	resultingClubId: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

export const Default: Story = {
	args: { pending },
};
