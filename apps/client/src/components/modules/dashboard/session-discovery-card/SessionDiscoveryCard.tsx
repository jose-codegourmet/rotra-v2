"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { PlayerAvatarStack } from "@/components/modules/dashboard/dashboard-map/PlayerAvatarStack";
import {
	sessionDiscoveryCardVariants,
	sessionDiscoveryStatusBadgeVariants,
} from "@/components/modules/dashboard/session-discovery-card/SessionDiscoveryCard.variants";
import {
	formatSessionDate,
	formatSessionDateTimeRange,
	formatSessionTimeRange,
	getSessionDisplayStatus,
	getSessionDisplayStatusLabel,
} from "@/lib/dashboard/venue-session-utils";
import { formatDistanceKm } from "@/lib/geo/haversine";
import { cn } from "@/lib/utils";
import type { SessionDiscoveryItem } from "@/types/session-discovery";

interface SessionDiscoveryCardProps {
	session: SessionDiscoveryItem;
	variant?: "compact" | "list" | "grid";
	compactLayout?: "full" | "row";
	showAvatars?: boolean;
	onJoin?: (sessionId: string) => void;
	className?: string;
}

function StatusBadge({ session }: { session: SessionDiscoveryItem }) {
	const status = getSessionDisplayStatus(session);
	const label =
		status === "live" ? "Live Now" : getSessionDisplayStatusLabel(status);

	return (
		<span className={sessionDiscoveryStatusBadgeVariants({ status })}>
			{label}
		</span>
	);
}

function SessionActionButton({
	session,
	onJoin,
	className,
}: {
	session: SessionDiscoveryItem;
	onJoin?: (sessionId: string) => void;
	className?: string;
}) {
	const router = useRouter();

	if (session.isOwner) {
		return (
			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					router.push(`/find-sessions/${session.id}`);
				}}
				className={cn(
					"shrink-0 rounded-md border border-border px-3 py-1 text-[10px] font-bold uppercase text-text-primary",
					className,
				)}
			>
				View
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={(event) => {
				event.stopPropagation();
				onJoin?.(session.id);
			}}
			className={cn(
				"shrink-0 rounded-md bg-accent px-3 py-1 text-[10px] font-bold uppercase text-bg-base",
				className,
			)}
		>
			Join
		</button>
	);
}

function SessionSchedule({
	session,
	compact = false,
}: {
	session: SessionDiscoveryItem;
	compact?: boolean;
}) {
	if (compact) {
		return (
			<span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">
				{formatSessionDateTimeRange(session)}
			</span>
		);
	}

	return (
		<div className="flex flex-col gap-0.5 text-xs text-text-secondary">
			<span>{formatSessionDate(session)}</span>
			<div className="flex items-center gap-2">
				<Clock size={12} className="shrink-0" />
				<span>{formatSessionTimeRange(session)}</span>
			</div>
		</div>
	);
}

function CompactFullCard({
	session,
	onJoin,
	showAvatars,
}: {
	session: SessionDiscoveryItem;
	onJoin?: (sessionId: string) => void;
	showAvatars?: boolean;
}) {
	return (
		<div className={cn("compact-full-card", "w-full")}>
			<div className="flex items-start justify-between gap-2">
				<StatusBadge session={session} />
				{session.distanceKm != null && (
					<span className="text-[10px] font-medium text-text-secondary">
						{formatDistanceKm(session.distanceKm)}
					</span>
				)}
			</div>
			<h4 className="text-sm font-bold text-text-primary">
				{session.clubName ?? session.location}
			</h4>
			{session.clubName ? (
				<p className="text-xs text-text-secondary">{session.location}</p>
			) : null}
			<SessionSchedule session={session} />
			{showAvatars ? (
				<div>
					<PlayerAvatarStack session={session} />
				</div>
			) : null}
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-accent">
					{session.acceptedCount}/{session.totalSlots} Slots
				</span>
				<SessionActionButton
					session={session}
					{...(onJoin ? { onJoin } : {})}
				/>
			</div>
		</div>
	);
}

function CompactRowCard({
	session,
	onJoin,
}: {
	session: SessionDiscoveryItem;
	onJoin?: (sessionId: string) => void;
}) {
	return (
		<div className={cn("compact-row-card", "w-full")}>
			<StatusBadge session={session} />
			<SessionSchedule session={session} compact />
			<span className="shrink-0 text-[10px] font-bold text-accent">
				{session.acceptedCount}/{session.totalSlots}
			</span>
			<SessionActionButton session={session} {...(onJoin ? { onJoin } : {})} />
		</div>
	);
}

function ListCard({
	session,
	onJoin,
}: {
	session: SessionDiscoveryItem;
	onJoin?: (sessionId: string) => void;
}) {
	return (
		<div className={cn("list-card", "w-full")}>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-start justify-between gap-2">
					<StatusBadge session={session} />
					{session.distanceKm != null && (
						<span className="text-[10px] font-medium text-text-secondary">
							{formatDistanceKm(session.distanceKm)}
						</span>
					)}
				</div>
				<h4 className="text-sm font-bold text-text-primary">
					{session.clubName ?? session.location}
				</h4>
				{session.clubName ? (
					<p className="text-xs text-text-secondary">{session.location}</p>
				) : null}
				<SessionSchedule session={session} />
			</div>
			<div className="flex shrink-0 flex-col items-end gap-3">
				<span className="text-xs font-bold text-accent">
					{session.acceptedCount}/{session.totalSlots} Slots
				</span>
				<SessionActionButton
					session={session}
					{...(onJoin ? { onJoin } : {})}
				/>
			</div>
		</div>
	);
}

function GridCard({
	session,
	onJoin,
}: {
	session: SessionDiscoveryItem;
	onJoin?: (sessionId: string) => void;
}) {
	return (
		<div className={cn("grid-card", "w-full")}>
			<div className="flex items-start justify-between gap-2">
				<StatusBadge session={session} />
				{session.distanceKm != null && (
					<span className="text-[10px] font-medium text-text-secondary">
						{formatDistanceKm(session.distanceKm)}
					</span>
				)}
			</div>
			<h4 className="text-sm font-bold text-text-primary">
				{session.clubName ?? session.location}
			</h4>
			{session.clubName ? (
				<p className="text-xs text-text-secondary">{session.location}</p>
			) : null}
			<SessionSchedule session={session} />
			<div className="mt-auto flex items-center justify-between gap-3">
				<span className="text-xs font-bold text-accent">
					{session.acceptedCount}/{session.totalSlots} Slots
				</span>
				<SessionActionButton
					session={session}
					{...(onJoin ? { onJoin } : {})}
				/>
			</div>
		</div>
	);
}

export function SessionDiscoveryCard({
	session,
	variant = "grid",
	compactLayout = "full",
	showAvatars = false,
	onJoin,
	className,
}: SessionDiscoveryCardProps) {
	const router = useRouter();
	const isNavigable = variant === "list" || variant === "grid";

	const handleNavigate = () => {
		router.push(`/find-sessions/${session.id}`);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
		if (!isNavigable) return;
		if (event.key === "Enter") {
			event.preventDefault();
			handleNavigate();
		}
	};

	return (
		<article
			tabIndex={isNavigable ? 0 : undefined}
			onClick={isNavigable ? handleNavigate : undefined}
			onKeyDown={handleKeyDown}
			className={cn(
				sessionDiscoveryCardVariants({
					variant,
					...(variant === "compact" ? { compactLayout } : {}),
				}),
				isNavigable && "cursor-pointer hover:bg-bg-overlay/50",
				className,
			)}
		>
			{variant === "compact" && compactLayout === "row" ? (
				<CompactRowCard session={session} {...(onJoin ? { onJoin } : {})} />
			) : variant === "compact" ? (
				<CompactFullCard
					session={session}
					showAvatars={showAvatars}
					{...(onJoin ? { onJoin } : {})}
				/>
			) : variant === "list" ? (
				<ListCard session={session} {...(onJoin ? { onJoin } : {})} />
			) : (
				<GridCard session={session} {...(onJoin ? { onJoin } : {})} />
			)}
		</article>
	);
}
