"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DEFAULT_RADIUS_KM } from "@/constants/dashboard";
import { MOCK_VENUE_GROUPS } from "@/constants/mock-venue-groups";
import { MapSearchOverlay } from "./MapSearchOverlay";

const meta: Meta<typeof MapSearchOverlay> = {
	title: "dashboard/MapSearchOverlay",
	component: MapSearchOverlay,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="relative min-h-[420px] bg-bg-base">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof MapSearchOverlay>;

function MapSearchOverlayDemo(
	props: Partial<React.ComponentProps<typeof MapSearchOverlay>>,
) {
	const [clubQuery, setClubQuery] = useState(props.clubQuery ?? "");
	const [slotAvailability, setSlotAvailability] = useState<
		"full" | "not_full" | undefined
	>(props.slotAvailability);
	const [dateFrom, setDateFrom] = useState<string | undefined>(props.dateFrom);
	const [dateTo, setDateTo] = useState<string | undefined>(props.dateTo);
	const [radiusKm, setRadiusKm] = useState(props.radiusKm ?? DEFAULT_RADIUS_KM);

	return (
		<MapSearchOverlay
			locationLabel={props.locationLabel ?? "Cebu City"}
			geoStatus={props.geoStatus ?? "granted"}
			radiusKm={radiusKm}
			doublesOnly={props.doublesOnly ?? false}
			weekendOnly={props.weekendOnly ?? false}
			onRadiusChange={setRadiusKm}
			onToggleDoubles={() => {}}
			onToggleWeekend={() => {}}
			onRecenter={() => {}}
			onPlaceSelect={() => {}}
			clubQuery={clubQuery}
			onClubQueryChange={setClubQuery}
			venueGroups={props.venueGroups ?? MOCK_VENUE_GROUPS}
			slotAvailability={slotAvailability}
			onSlotAvailabilityChange={setSlotAvailability}
			dateFrom={dateFrom}
			dateTo={dateTo}
			onDateRangeChange={(from, to) => {
				setDateFrom(from);
				setDateTo(to);
			}}
			onDiscover={() => {}}
		/>
	);
}

export const PlaceModeDefault: Story = {
	render: () => <MapSearchOverlayDemo />,
};

export const ClubMode: Story = {
	render: () => <MapSearchOverlayDemo clubQuery="Sunrise" />,
};

export const FiltersActive: Story = {
	render: () => (
		<MapSearchOverlayDemo slotAvailability="not_full" doublesOnly weekendOnly />
	),
};

export const DateRangeSelected: Story = {
	render: () => (
		<MapSearchOverlayDemo dateFrom="2026-06-14" dateTo="2026-06-17" />
	),
};

export const NoGeolocation: Story = {
	render: () => (
		<MapSearchOverlayDemo locationLabel="" geoStatus="denied" radiusKm={50} />
	),
};
