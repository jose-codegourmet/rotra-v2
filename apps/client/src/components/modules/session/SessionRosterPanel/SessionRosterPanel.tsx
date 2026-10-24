"use client";

import { UserIcon } from "lucide-react";
import Image from "next/image";

import { useSessionRoster } from "@/hooks/useSessionRoster/client";
import { cn } from "@/lib/utils";
import type { SessionRosterPlayer } from "@/types/session-roster";

export interface SessionRosterPanelProps {
	sessionId: string;
	viewerPlayerId?: string | null;
	className?: string;
}

function paymentBadgeLabel(status: string): string {
	switch (status) {
		case "paid":
			return "Paid";
		case "partial":
			return "Partial";
		default:
			return "Unpaid";
	}
}

function paymentBadgeClass(status: string): string {
	switch (status) {
		case "paid":
			return "bg-accent text-bg-base";
		case "partial":
			return "bg-warning/20 text-warning";
		default:
			return "bg-warning text-bg-base";
	}
}

function RosterAvatar({
	player,
	isViewer,
	size = "lg",
}: {
	player: SessionRosterPlayer;
	isViewer: boolean;
	size?: "lg" | "sm";
}) {
	const dimension = size === "lg" ? "size-16" : "size-10";

	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-full bg-bg-elevated",
				dimension,
				isViewer && "ring-2 ring-accent ring-offset-2 ring-offset-bg-base",
			)}
		>
			{player.avatarUrl ? (
				<Image
					src={player.avatarUrl}
					alt=""
					fill
					className="object-cover"
					sizes={size === "lg" ? "64px" : "40px"}
					unoptimized
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center">
					<UserIcon
						size={size === "lg" ? 24 : 16}
						strokeWidth={1.5}
						className="text-text-secondary"
					/>
				</div>
			)}
		</div>
	);
}

function ConfirmedPlayerCard({
	player,
	isViewer,
}: {
	player: SessionRosterPlayer;
	isViewer: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-2">
			<RosterAvatar player={player} isViewer={isViewer} />
			<span
				className={cn(
					"rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
					paymentBadgeClass(player.paymentStatus),
				)}
			>
				{paymentBadgeLabel(player.paymentStatus)}
			</span>
		</div>
	);
}

function WaitlistedPlayerRow({
	player,
	isViewer,
}: {
	player: SessionRosterPlayer;
	isViewer: boolean;
}) {
	return (
		<li className="flex items-center gap-3 py-3">
			<span className="w-6 shrink-0 text-2xl font-black tabular-nums text-text-disabled">
				{player.waitlistPosition ?? "—"}
			</span>
			<RosterAvatar player={player} isViewer={isViewer} size="sm" />
			<span className="text-small font-bold text-text-primary">
				{player.displayName}
			</span>
		</li>
	);
}

export function SessionRosterPanel({
	sessionId,
	viewerPlayerId = null,
	className,
}: SessionRosterPanelProps) {
	const { data: roster, isLoading } = useSessionRoster(sessionId);

	return (
		<section className={cn("space-y-6", className)}>
			<div className="space-y-4">
				<h2 className="text-micro font-black uppercase tracking-[0.2em] text-text-disabled">
					Confirmed
					{roster ? ` · ${roster.accepted.length}` : ""}
				</h2>
				{isLoading ? (
					<p className="text-small text-text-secondary">Loading roster…</p>
				) : roster && roster.accepted.length > 0 ? (
					<div className="grid grid-cols-4 gap-4 sm:gap-6">
						{roster.accepted.map((player) => (
							<ConfirmedPlayerCard
								key={player.id}
								player={player}
								isViewer={player.playerId === viewerPlayerId}
							/>
						))}
					</div>
				) : (
					<p className="text-small text-text-secondary">
						No confirmed players yet.
					</p>
				)}
			</div>

			{roster && roster.waitlisted.length > 0 ? (
				<div className="space-y-2">
					<h2 className="text-micro font-black uppercase tracking-[0.2em] text-text-disabled">
						Waitlisted · {roster.waitlisted.length}
					</h2>
					<ul className="divide-y divide-border">
						{roster.waitlisted.map((player) => (
							<WaitlistedPlayerRow
								key={player.id}
								player={player}
								isViewer={player.playerId === viewerPlayerId}
							/>
						))}
					</ul>
				</div>
			) : null}
		</section>
	);
}
