"use client";

import { Bolt, Building2 } from "lucide-react";
import { Marker } from "react-map-gl/mapbox";
import { useFinePointer } from "@/hooks/useFinePointer/client";
import {
	getVenuePinVariant,
	isVenueFullyBooked,
} from "@/lib/dashboard/venue-session-utils";
import { cn } from "@/lib/utils";
import type { VenueSessionGroup } from "@/types/session-discovery";
import {
	venuePinCountBadgeVariants,
	venuePinVariants,
} from "./VenuePin.variants";

interface VenuePinVisualProps {
	group: VenueSessionGroup;
	isSelected: boolean;
	className?: string;
}

export function VenuePinVisual({
	group,
	isSelected,
	className,
}: VenuePinVisualProps) {
	const variant = getVenuePinVariant(group);
	const isFull = isVenueFullyBooked(group);
	const sessionCount = group.sessions.length;

	return (
		<div className={cn("relative flex flex-col items-center", className)}>
			<div
				className={cn(
					venuePinVariants({
						variant,
						full: isFull,
						selected: isSelected,
					}),
				)}
			>
				{variant === "live" ? (
					<Bolt size={18} fill="currentColor" strokeWidth={0} />
				) : (
					<Building2 size={14} strokeWidth={2} />
				)}
				{sessionCount > 1 && (
					<span className={venuePinCountBadgeVariants()}>{sessionCount}</span>
				)}
			</div>
			{isFull && (
				<span className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-text-secondary">
					Full
				</span>
			)}
		</div>
	);
}

interface VenuePinProps {
	group: VenueSessionGroup;
	isSelected: boolean;
	onSelect: (venueKey: string | null) => void;
	onHoverStart?: (venueKey: string) => void;
	onHoverEnd?: () => void;
}

export function VenuePin({
	group,
	isSelected,
	onSelect,
	onHoverStart,
	onHoverEnd,
}: VenuePinProps) {
	const hasFinePointer = useFinePointer();

	return (
		<Marker
			longitude={group.coordinates.lng}
			latitude={group.coordinates.lat}
			anchor="bottom"
		>
			<button
				type="button"
				aria-label={`${group.venueName}, ${group.sessions.length} session${group.sessions.length === 1 ? "" : "s"}`}
				aria-expanded={isSelected}
				className="cursor-pointer"
				onMouseEnter={() => {
					if (!hasFinePointer) return;
					onHoverStart?.(group.venueKey);
				}}
				onMouseLeave={() => {
					if (!hasFinePointer) return;
					onHoverEnd?.();
				}}
				onClick={(event) => {
					event.stopPropagation();
					if (hasFinePointer) return;
					onSelect(isSelected ? null : group.venueKey);
				}}
			>
				<VenuePinVisual group={group} isSelected={isSelected} />
			</button>
		</Marker>
	);
}
