"use client";

import { SessionDiscoveryCard } from "@/components/modules/dashboard/session-discovery-card/SessionDiscoveryCard";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
import { formatDistanceKm } from "@/lib/geo/haversine";
import { cn } from "@/lib/utils";
import type { VenueSessionGroup } from "@/types/session-discovery";

interface VenueSessionsModalProps {
	group: VenueSessionGroup | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onJoin: (sessionId: string) => void;
}

export function VenueSessionsModal({
	group,
	open,
	onOpenChange,
	onJoin,
}: VenueSessionsModalProps) {
	if (!group) return null;

	const sessionCount = group.sessions.length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"max-h-[85dvh] overflow-y-auto sm:max-w-md",
					"top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
					"rounded-b-none rounded-t-xl sm:rounded-xl",
				)}
			>
				<DialogHeader>
					<DialogTitle>{group.venueName}</DialogTitle>
					<DialogDescription>
						{[
							group.venueAddress,
							group.distanceKm != null
								? `${formatDistanceKm(group.distanceKm)} away`
								: null,
						]
							.filter(Boolean)
							.join(" · ")}
					</DialogDescription>
				</DialogHeader>
				<div className="pt-2">
					<p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">
						{sessionCount} session{sessionCount === 1 ? "" : "s"} at this venue
					</p>
					<div className="flex flex-col gap-3">
						{group.sessions.map((session) => (
							<SessionDiscoveryCard
								key={session.id}
								variant="compact"
								compactLayout="row"
								session={session}
								onJoin={onJoin}
							/>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
