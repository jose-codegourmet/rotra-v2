"use client";

import { PlayerAvatarStack } from "@/components/modules/dashboard/dashboard-map/PlayerAvatarStack";
import { SessionDiscoveryCard } from "@/components/modules/dashboard/session-discovery-card/SessionDiscoveryCard";
import { formatDistanceKm } from "@/lib/geo/haversine";
import type { VenueSessionGroup } from "@/types/session-discovery";

interface VenuePinTooltipProps {
	group: VenueSessionGroup;
	onJoin: (id: string) => void;
	onOpenModal: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}

function MultiSessionTooltip({
	group,
	onJoin,
	onOpenModal,
}: {
	group: VenueSessionGroup;
	onJoin: (id: string) => void;
	onOpenModal: () => void;
}) {
	const previewSessions = group.sessions.slice(0, 2);
	const remainingCount = group.sessions.length - 2;

	return (
		<>
			<div className="mb-2 flex items-start justify-between gap-2">
				<h4 className="text-sm font-bold text-text-primary">
					{group.venueName}
				</h4>
				{group.distanceKm != null && (
					<span className="shrink-0 text-[10px] font-medium text-text-secondary">
						{formatDistanceKm(group.distanceKm)} away
					</span>
				)}
			</div>
			<div className="flex flex-col gap-2">
				{previewSessions.map((session) => (
					<div key={session.id} className="flex flex-col gap-2">
						<SessionDiscoveryCard
							variant="compact"
							compactLayout="row"
							session={session}
							onJoin={onJoin}
						/>
						<PlayerAvatarStack session={session} compact />
					</div>
				))}
			</div>
			{remainingCount > 0 && (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onOpenModal();
					}}
					className="mt-2 w-full rounded-lg border border-outline-variant/20 py-2 text-[10px] font-bold uppercase tracking-widest text-accent transition-colors hover:bg-accent/10"
				>
					See {remainingCount} more session{remainingCount === 1 ? "" : "s"}
				</button>
			)}
		</>
	);
}

export function VenuePinTooltip({
	group,
	onJoin,
	onOpenModal,
	onMouseEnter,
	onMouseLeave,
}: VenuePinTooltipProps) {
	const isSingle = group.sessions.length === 1;
	const singleSession = group.sessions[0];

	if (isSingle && !singleSession) return null;

	return (
		<div className="flex flex-col items-center">
			<div
				className="w-64 rounded-xl border border-outline-variant/20 bg-bg-base/80 p-4 shadow-2xl backdrop-blur-xl"
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
				role="dialog"
				aria-label={`Sessions at ${group.venueName}`}
			>
				{isSingle && singleSession ? (
					<SessionDiscoveryCard
						variant="compact"
						compactLayout="full"
						session={singleSession}
						onJoin={onJoin}
						showAvatars
					/>
				) : (
					<MultiSessionTooltip
						group={group}
						onJoin={onJoin}
						onOpenModal={onOpenModal}
					/>
				)}
			</div>
			<div className="h-0 w-0 border-x-[8px] border-x-transparent border-t-[8px] border-t-bg-base/80" />
		</div>
	);
}
