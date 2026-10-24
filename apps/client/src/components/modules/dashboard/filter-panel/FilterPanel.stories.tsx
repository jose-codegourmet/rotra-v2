"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MOCK_VENUE_GROUPS } from "@/constants/mock-venue-groups";
import type { PanelFilterState } from "@/lib/dashboard/venue-session-utils";
import { FilterPanelBody } from "./FilterPanel";

const meta: Meta<typeof FilterPanelBody> = {
	title: "dashboard/FilterPanel",
	component: FilterPanelBody,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="mx-auto w-full max-w-sm rounded-2xl border border-outline-variant/10 bg-bg-base p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FilterPanelBody>;

function FilterPanelDemo({
	initialFilters = {},
}: {
	initialFilters?: PanelFilterState;
}) {
	const [pendingFilters, setPendingFilters] =
		useState<PanelFilterState>(initialFilters);

	return (
		<FilterPanelBody
			venueGroups={MOCK_VENUE_GROUPS}
			pendingFilters={pendingFilters}
			onPendingFiltersChange={setPendingFilters}
			onApply={() => {}}
			onClose={() => {}}
		/>
	);
}

export const NoFilters: Story = {
	render: () => <FilterPanelDemo />,
};

export const NotFullSelected: Story = {
	render: () => (
		<FilterPanelDemo initialFilters={{ slotAvailability: "not_full" }} />
	),
};

export const FullSelected: Story = {
	render: () => (
		<FilterPanelDemo initialFilters={{ slotAvailability: "full" }} />
	),
};

export const ClearAll: Story = {
	render: () => (
		<FilterPanelDemo initialFilters={{ slotAvailability: "not_full" }} />
	),
};
