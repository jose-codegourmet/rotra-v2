"use client";

import { SessionDiscoveryCard } from "@/components/modules/dashboard/session-discovery-card/SessionDiscoveryCard";
import type { SessionDiscoveryItem } from "@/types/session-discovery";

interface SessionGridViewProps {
	sessions: SessionDiscoveryItem[];
	onJoinSession?: (sessionId: string) => void;
	onAdjustFilters?: () => void;
	isLoading?: boolean;
}

export function SessionGridView({
	sessions,
	onJoinSession,
	onAdjustFilters,
	isLoading,
}: SessionGridViewProps) {
	if (isLoading) {
		return (
			<div className="h-full overflow-y-auto bg-bg-surface px-4 pb-24 md:px-8">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="h-40 animate-pulse rounded-xl bg-bg-elevated"
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
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{sessions.map((session) => (
					<SessionDiscoveryCard
						key={session.id}
						session={session}
						variant="grid"
						{...(onJoinSession ? { onJoin: onJoinSession } : {})}
						className={session.status === "active" ? "sm:col-span-2" : ""}
					/>
				))}
			</div>
		</div>
	);
}
