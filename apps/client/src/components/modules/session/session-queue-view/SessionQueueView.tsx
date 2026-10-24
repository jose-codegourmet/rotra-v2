"use client";

import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/Button";
import { Pill } from "@/components/ui/pill/Pill";
import {
	MOCK_QUEUE_NEXT_UP_PLAYERS,
	MOCK_QUEUE_UPCOMING_MATCHES,
	MOCK_SESSION_QUEUE,
	QUEUE_STATUS_LABELS,
	type QueueNextUpPlayer,
	type QueuePlayerStatus,
	type QueueUpcomingMatch,
	type SessionQueueFixture,
} from "@/constants/mock-session-queue";
import { cn } from "@/lib/utils";

export type SessionQueueViewProps = {
	session?: SessionQueueFixture;
	nextUpPlayers?: QueueNextUpPlayer[];
	upcomingMatches?: QueueUpcomingMatch[];
};

const STATUS_PILL: Record<QueuePlayerStatus, string> = {
	ready: "bg-accent/15 text-accent",
	waiting: "bg-warning/15 text-warning",
};

export function SessionQueueView({
	session = MOCK_SESSION_QUEUE,
	nextUpPlayers = MOCK_QUEUE_NEXT_UP_PLAYERS,
	upcomingMatches = MOCK_QUEUE_UPCOMING_MATCHES,
}: SessionQueueViewProps) {
	const handleSendToCourt = () => {
		toast.success(session.sendToast);
	};

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-4">
			<header className="flex items-start justify-between gap-4 pt-6">
				<div>
					<p className="text-heading font-bold uppercase tracking-wide text-text-primary">
						ROTRA
					</p>
					<p className="text-small text-text-secondary">Run the game.</p>
				</div>
				<Pill variant="accent" className="gap-1.5 font-semibold">
					<span className="size-1.5 rounded-full bg-accent" aria-hidden />
					{session.roleBadge}
				</Pill>
			</header>

			<p className="mt-5 flex items-center gap-2 text-micro font-medium uppercase tracking-widest text-accent">
				<span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
				{session.eyebrow}
			</p>

			<h1 className="mt-4 text-display font-bold tracking-tight text-text-primary">
				{session.headline}
			</h1>
			<p className="mt-2 text-body text-text-secondary">{session.subLine}</p>

			<section className="mt-6">
				<div className="flex items-start justify-between gap-3">
					<p className="text-small font-semibold text-text-primary">
						{session.nextUpLabel}
					</p>
					<p className="text-right text-small text-text-secondary">
						{session.nextUpPairing}
					</p>
				</div>

				<ul className="mt-2 rounded-xl border border-accent bg-bg-surface p-3 shadow-card">
					{nextUpPlayers.map((player) => (
						<li key={player.id}>
							<NextUpPlayerRow player={player} />
						</li>
					))}
				</ul>
			</section>

			<section className="mt-6">
				<div className="flex items-center justify-between gap-3">
					<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
						{session.nextMatchesLabel}
					</p>
					<p className="text-micro text-text-secondary">
						{session.reorderHint}
					</p>
				</div>

				<ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-bg-surface shadow-card">
					{upcomingMatches.map((match) => (
						<li key={match.id} className="px-3 py-3">
							<UpcomingMatchRow match={match} />
						</li>
					))}
				</ul>
			</section>

			<div className="sticky bottom-0 mt-auto bg-bg-base pt-3">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={handleSendToCourt}
					className="h-12 w-full rounded-lg border-text-primary text-small font-black uppercase tracking-widest"
				>
					{session.ctaLabel}
				</Button>
			</div>
		</div>
	);
}

SessionQueueView.displayName = "SessionQueueView";

function DragGrip() {
	return (
		<span className="shrink-0 text-text-disabled" aria-hidden>
			<GripVertical className="size-4" />
		</span>
	);
}

function InitialsAvatar({
	initials,
	size,
}: {
	initials: string;
	size: "lg" | "sm";
}) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full bg-bg-elevated font-semibold text-text-primary",
				size === "lg" ? "size-16 text-small" : "size-7 text-micro",
			)}
			aria-hidden
		>
			{initials}
		</span>
	);
}

function QueueStatusBadge({ status }: { status: QueuePlayerStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
				STATUS_PILL[status],
			)}
		>
			{QUEUE_STATUS_LABELS[status]}
		</span>
	);
}

function NextUpPlayerRow({ player }: { player: QueueNextUpPlayer }) {
	return (
		<div className="flex items-center gap-3 py-2">
			<DragGrip />
			<InitialsAvatar initials={player.initials} size="lg" />
			<div className="min-w-0 flex-1">
				<p className="text-small font-semibold text-text-primary">
					{player.name}
				</p>
				<p className="text-small text-text-secondary">{player.waitLabel}</p>
			</div>
			<QueueStatusBadge status={player.status} />
		</div>
	);
}

function UpcomingMatchRow({ match }: { match: QueueUpcomingMatch }) {
	return (
		<div className="flex items-center gap-3">
			<DragGrip />
			<span
				className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-micro font-bold text-text-primary"
				aria-hidden
			>
				{match.rank}
			</span>
			<div className="flex items-center">
				{match.players.map((player, index) => (
					<span
						key={player.id}
						className={cn(
							"relative rounded-full border-2 border-bg-surface",
							index > 0 && "-ml-2",
						)}
						style={{ zIndex: match.players.length - index }}
					>
						<InitialsAvatar initials={player.initials} size="sm" />
					</span>
				))}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-small font-semibold text-text-primary">
					{match.teamA}
				</p>
				<p className="text-small text-text-secondary">{`vs ${match.teamB}`}</p>
			</div>
			<div className="shrink-0 text-right">
				<QueueStatusBadge status={match.status} />
				<p className="mt-1 text-small text-text-secondary">{match.waitLabel}</p>
			</div>
		</div>
	);
}
