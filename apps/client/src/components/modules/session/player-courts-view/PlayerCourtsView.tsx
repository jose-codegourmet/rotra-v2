import { Clock, LayoutGrid } from "lucide-react";
import { PlayerSessionShell } from "@/components/modules/session/player-session-shell/PlayerSessionShell";
import {
	MOCK_PLAYER_COURTS,
	MOCK_PLAYER_COURTS_COPY,
	PLAYER_COURT_STATUS_LABELS,
	type PlayerCourt,
	type PlayerCourtStatus,
} from "@/constants/mock-player-session";
import { cn } from "@/lib/utils";

const STATUS_FILLED: Record<PlayerCourtStatus, string> = {
	active: "bg-accent/15 text-accent",
	empty: "bg-bg-elevated text-text-secondary",
};

const STATUS_DOT: Record<PlayerCourtStatus, string> = {
	active: "bg-accent",
	empty: "bg-text-disabled",
};

export type PlayerCourtsViewProps = {
	copy?: typeof MOCK_PLAYER_COURTS_COPY;
	courts?: PlayerCourt[];
};

export function PlayerCourtsView({
	copy = MOCK_PLAYER_COURTS_COPY,
	courts = MOCK_PLAYER_COURTS,
}: PlayerCourtsViewProps) {
	return (
		<PlayerSessionShell
			activeTab="courts"
			eyebrow={copy.eyebrow}
			headline={copy.headline}
			subLine={copy.subLine}
		>
			<ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4 md:items-stretch">
				{courts.map((court) => (
					<li key={court.id}>
						<PlayerCourtCard court={court} />
					</li>
				))}
			</ul>
		</PlayerSessionShell>
	);
}

PlayerCourtsView.displayName = "PlayerCourtsView";

function CourtStatusBadge({ status }: { status: PlayerCourtStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
				STATUS_FILLED[status],
			)}
		>
			<span
				className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
				aria-hidden
			/>
			{PLAYER_COURT_STATUS_LABELS[status]}
		</span>
	);
}

function PlayerCourtCard({ court }: { court: PlayerCourt }) {
	const isEmpty = court.status === "empty";

	return (
		<article className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-bg-surface p-4 shadow-card md:min-h-[280px]">
			<div className="flex items-center justify-between gap-3">
				<p className="flex items-center gap-2 text-small font-semibold text-text-primary">
					<LayoutGrid className="size-4 text-text-secondary" aria-hidden />
					{court.name}
				</p>
				<CourtStatusBadge status={court.status} />
			</div>

			{isEmpty ? (
				<div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
					<LayoutGrid className="size-6 text-text-secondary" aria-hidden />
					<p className="mt-2 text-small text-text-secondary">
						{court.emptyMessage}
					</p>
				</div>
			) : (
				<>
					<div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
						<div>
							<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
								{court.teamA?.label}
							</p>
							<ul className="mt-1 space-y-0.5">
								{court.teamA?.players.map((name) => (
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
								{court.teamB?.label}
							</p>
							<ul className="mt-1 space-y-0.5">
								{court.teamB?.players.map((name) => (
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

					<p className="mt-4 text-center text-4xl font-bold tabular-nums tracking-tight text-text-primary">
						{court.score}
					</p>
					<p className="mt-2 flex items-center justify-center gap-1.5 text-small text-text-secondary">
						<Clock className="size-3.5" aria-hidden />
						{court.elapsed}
					</p>
				</>
			)}
		</article>
	);
}
