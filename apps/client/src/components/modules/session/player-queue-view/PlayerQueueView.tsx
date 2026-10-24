import { Users } from "lucide-react";
import { PlayerSessionShell } from "@/components/modules/session/player-session-shell/PlayerSessionShell";
import {
	MOCK_PLAYER_QUEUE_COPY,
	MOCK_PLAYER_QUEUE_NEXT,
	MOCK_PLAYER_QUEUE_ROWS,
	PLAYER_QUEUE_BADGE_LABELS,
	type PlayerQueueAvatar,
	type PlayerQueueBadge,
	type PlayerQueueRow,
} from "@/constants/mock-player-session";
import { cn } from "@/lib/utils";

const BADGE_CLASS: Record<PlayerQueueBadge, string> = {
	ready: "bg-accent/15 text-accent",
	waiting: "bg-warning/15 text-warning",
	you: "bg-accent/15 text-accent",
};

export type PlayerQueueViewProps = {
	copy?: typeof MOCK_PLAYER_QUEUE_COPY;
	nextPairing?: typeof MOCK_PLAYER_QUEUE_NEXT;
	rows?: PlayerQueueRow[];
};

export function PlayerQueueView({
	copy = MOCK_PLAYER_QUEUE_COPY,
	nextPairing = MOCK_PLAYER_QUEUE_NEXT,
	rows = MOCK_PLAYER_QUEUE_ROWS,
}: PlayerQueueViewProps) {
	return (
		<PlayerSessionShell
			activeTab="queue"
			eyebrow={copy.eyebrow}
			headline={copy.headline}
			subLine={copy.subLine}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-stretch">
				<section className="flex min-w-0 flex-col">
					<div className="mb-2 flex items-center justify-between gap-3">
						<h2 className="text-micro font-medium uppercase tracking-widest text-text-secondary">
							{copy.nextUpLabel}
						</h2>
						<p className="text-micro text-text-secondary">{copy.nextUpMatch}</p>
					</div>
					<article className="flex flex-1 flex-col rounded-lg border border-accent/30 bg-bg-surface p-4 shadow-card">
						<div className="flex items-center justify-between gap-3">
							<p className="flex items-center gap-2 text-small font-semibold text-text-primary">
								<Users className="size-4 text-text-secondary" aria-hidden />
								{copy.nextPairingLabel}
							</p>
							<span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-micro font-bold uppercase tracking-widest text-accent">
								{copy.nextPairingBadge}
							</span>
						</div>
						<div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
							<div>
								<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
									{copy.teamALabel}
								</p>
								<ul className="mt-1 space-y-0.5">
									{nextPairing.teamA.map((name) => (
										<li
											key={name}
											className="text-small font-semibold text-text-primary"
										>
											{name}
										</li>
									))}
								</ul>
							</div>
							<p className="pt-4 text-micro font-semibold uppercase tracking-widest text-text-disabled">
								vs
							</p>
							<div className="text-right">
								<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
									{copy.teamBLabel}
								</p>
								<ul className="mt-1 space-y-0.5">
									{nextPairing.teamB.map((name) => (
										<li
											key={name}
											className="text-small font-semibold text-text-primary"
										>
											{name}
										</li>
									))}
								</ul>
							</div>
						</div>
					</article>
				</section>

				<section className="flex min-w-0 flex-col">
					<div className="mb-2 flex items-center justify-between gap-3">
						<h2 className="text-micro font-medium uppercase tracking-widest text-text-secondary">
							{copy.upNextLabel}
						</h2>
						<p className="text-micro text-text-secondary">
							{copy.viewOnlyHint}
						</p>
					</div>
					<ul className="overflow-hidden rounded-lg border border-border bg-bg-surface shadow-card">
						{rows.map((row) => (
							<li
								key={row.id}
								className={cn(
									"flex h-16 items-center gap-2 border-b border-border px-3 last:border-0",
									row.isYou && "bg-accent/15",
								)}
							>
								<QueueRow row={row} />
							</li>
						))}
					</ul>
				</section>
			</div>
		</PlayerSessionShell>
	);
}

PlayerQueueView.displayName = "PlayerQueueView";

function QueueBadge({ badge }: { badge: PlayerQueueBadge }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
				BADGE_CLASS[badge],
			)}
		>
			{PLAYER_QUEUE_BADGE_LABELS[badge]}
		</span>
	);
}

function QueueAvatars({ players }: { players: PlayerQueueAvatar[] }) {
	return (
		<div className="flex shrink-0" aria-hidden>
			{players.map((player, index) => (
				<span
					key={player.id}
					className={cn(
						"relative inline-flex size-7 items-center justify-center rounded-full border-2 text-micro font-semibold",
						index > 0 && "-ml-1.5",
						player.isYou
							? "border-accent/35 bg-accent/15 text-accent"
							: "border-bg-surface bg-bg-elevated text-text-primary",
					)}
				>
					{player.initials}
				</span>
			))}
		</div>
	);
}

function QueueRow({ row }: { row: PlayerQueueRow }) {
	return (
		<>
			<span
				className={cn(
					"flex size-6 shrink-0 items-center justify-center rounded-sm text-micro font-bold",
					row.isYou
						? "border border-accent/30 bg-accent/15 text-accent"
						: "border border-border-strong bg-bg-elevated text-text-secondary",
				)}
				aria-hidden
			>
				{row.rank}
			</span>
			<QueueAvatars players={row.players} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-small font-semibold text-text-primary">
					<span className="md:hidden">{row.teamA}</span>
					<span className="hidden md:inline">{row.teamAWide ?? row.teamA}</span>
				</p>
				<p className="truncate text-micro text-text-secondary">{`vs ${row.teamB}`}</p>
			</div>
			<div className="flex shrink-0 flex-col items-end gap-1">
				<QueueBadge badge={row.badge} />
				<p className="text-micro text-text-secondary">{row.waitLabel}</p>
			</div>
		</>
	);
}
