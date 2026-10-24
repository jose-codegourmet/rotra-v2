"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveSessionSummary } from "@/types/session-discovery";

export interface ActiveSessionBannerProps {
	session: ActiveSessionSummary;
	onNavigate: () => void;
	className?: string;
}

export function ActiveSessionBanner({
	session,
	onNavigate,
	className,
}: ActiveSessionBannerProps) {
	const isLive = session.status === "active";
	const statusLabel = isLive ? "LIVE" : "IN QUEUE";

	return (
		<button
			type="button"
			onClick={onNavigate}
			className={cn(
				"pointer-events-auto flex w-full items-center gap-3 rounded-xl",
				"border border-accent-dim/40 border-l-[3px] border-l-accent",
				"bg-accent-subtle px-4 py-3 text-left",
				"transition-colors hover:bg-accent/10",
				className,
			)}
			aria-label={`${statusLabel}: ${session.clubName ?? session.location}. View session.`}
		>
			<span className="flex shrink-0 items-center gap-2">
				<span
					className="size-2 shrink-0 animate-pulse rounded-full bg-accent"
					aria-hidden="true"
				/>
				<span className="text-[10px] font-bold uppercase tracking-widest text-accent">
					{statusLabel}
				</span>
			</span>

			<span className="min-w-0 flex-1">
				{session.courtHint ? (
					<span className="block text-xs text-text-secondary">
						{session.courtHint}
					</span>
				) : null}
				<span className="block truncate text-sm font-bold text-text-primary">
					{session.clubName ?? session.location}
				</span>
			</span>

			<span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent">
				View session
				<ChevronRight className="size-3.5" aria-hidden="true" />
			</span>
		</button>
	);
}
