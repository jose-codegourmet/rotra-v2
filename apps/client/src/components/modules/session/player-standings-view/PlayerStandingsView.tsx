import { PlayerSessionShell } from "@/components/modules/session/player-session-shell/PlayerSessionShell";
import {
	MOCK_PLAYER_STANDINGS,
	MOCK_PLAYER_STANDINGS_COPY,
	type PlayerStandingRow,
} from "@/constants/mock-player-session";
import { cn } from "@/lib/utils";

export type PlayerStandingsViewProps = {
	copy?: typeof MOCK_PLAYER_STANDINGS_COPY;
	rows?: PlayerStandingRow[];
};

export function PlayerStandingsView({
	copy = MOCK_PLAYER_STANDINGS_COPY,
	rows = MOCK_PLAYER_STANDINGS,
}: PlayerStandingsViewProps) {
	return (
		<PlayerSessionShell
			activeTab="standings"
			eyebrow={copy.eyebrow}
			headline={copy.headline}
			subLine={copy.subLine}
		>
			<section className="overflow-hidden rounded-lg border border-border bg-bg-surface shadow-card">
				<div className="flex h-8 items-center gap-2.5 border-b border-border px-3 text-micro font-medium uppercase tracking-widest text-text-secondary">
					<span className="size-6 shrink-0" aria-hidden />
					<span className="size-10 shrink-0" aria-hidden />
					<span className="min-w-0 flex-1">{copy.playerColumn}</span>
					<span className="w-11 shrink-0 text-right">{copy.recordColumn}</span>
					<span className="w-9 shrink-0 text-right">{copy.pointsColumn}</span>
				</div>
				<ul>
					{rows.map((row) => (
						<li
							key={row.id}
							className={cn(
								"flex h-16 items-center gap-2.5 border-b border-border px-3 last:border-0",
								row.isYou && "bg-accent/15",
							)}
						>
							<StandingRow row={row} youBadge={copy.youBadge} />
						</li>
					))}
				</ul>
			</section>
		</PlayerSessionShell>
	);
}

PlayerStandingsView.displayName = "PlayerStandingsView";

function StandingRow({
	row,
	youBadge,
}: {
	row: PlayerStandingRow;
	youBadge: string;
}) {
	return (
		<>
			<span
				className={cn(
					"flex size-6 shrink-0 items-center justify-center rounded-sm text-micro font-bold",
					row.isYou
						? "border border-accent/30 bg-accent/15 text-accent"
						: row.isGold
							? "border border-warning/30 bg-warning/15 text-warning"
							: "border border-border-strong bg-bg-elevated text-text-secondary",
				)}
				aria-hidden
			>
				{row.rank}
			</span>
			<span
				className={cn(
					"inline-flex size-10 shrink-0 items-center justify-center rounded-full text-label font-semibold",
					row.isYou
						? "border border-accent/30 bg-accent/15 text-accent"
						: "border border-border-strong bg-bg-elevated text-text-primary",
				)}
				aria-hidden
			>
				{row.initials}
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-body font-semibold text-text-primary">
					<span className="md:hidden">{row.name}</span>
					<span className="hidden md:inline">
						{row.isYou ? `You · ${row.name}` : row.name}
					</span>
					{row.isYou ? (
						<span className="ml-1.5 inline-flex h-5 align-middle items-center rounded-full border border-accent/20 bg-accent/15 px-1.5 text-micro font-bold uppercase tracking-widest text-accent">
							{youBadge}
						</span>
					) : null}
				</p>
				<p className="mt-0.5 text-label text-text-secondary">{row.status}</p>
			</div>
			<span className="w-11 shrink-0 text-right text-small font-semibold tabular-nums text-text-primary">
				{row.record}
			</span>
			<span
				className={cn(
					"w-9 shrink-0 text-right text-small font-bold tabular-nums",
					row.isYou ? "text-accent" : "text-text-primary",
				)}
			>
				{row.points}
			</span>
		</>
	);
}
