"use client";

import { SessionDiscoveryCard } from "@/components/modules/dashboard/session-discovery-card/SessionDiscoveryCard";
import type { SessionDiscoveryItem } from "@/types/session-discovery";

interface SessionListViewProps {
	sessions: SessionDiscoveryItem[];
	onJoinSession?: (sessionId: string) => void;
	onAdjustFilters?: () => void;
	isLoading?: boolean;
}

export function SessionListView({
	sessions,
	onJoinSession,
	onAdjustFilters,
	isLoading,
}: SessionListViewProps) {
	if (isLoading) {
		return (
			<div className="h-full overflow-y-auto bg-bg-surface px-4 pb-24 md:px-8">
				<div className="flex flex-col gap-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-24 animate-pulse rounded-xl bg-bg-elevated"
						/>
					))}
				</div>
			</div>
		);
	}

	if (sessions.length === 0) {
		return (
			<div className="flex h-full items-center justify-center bg-bg-surface px-8 pb-24 text-center">
				<div className="max-w-sm space-y-3">
					<p className="text-body text-text-secondary">
						No sessions in this area.
					</p>
					<p className="text-body text-text-secondary">
						Try expanding your search radius or check back later.
					</p>
					{onAdjustFilters ? (
						<button
							type="button"
							onClick={onAdjustFilters}
							className="text-small font-bold uppercase tracking-widest text-accent hover:underline"
						>
							Adjust filters
						</button>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto bg-bg-surface px-4 pb-24 md:px-8">
			<p className="mb-4 text-micro font-bold uppercase tracking-widest text-text-secondary">
				{sessions.length} sessions near you
			</p>
			<div className="flex flex-col gap-3">
				{sessions.map((session) => (
					<SessionDiscoveryCard
						key={session.id}
						session={session}
						variant="list"
						{...(onJoinSession ? { onJoin: onJoinSession } : {})}
					/>
				))}
			</div>
		</div>
	);
}
