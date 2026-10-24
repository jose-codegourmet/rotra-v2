import type { SessionQueuePlayer } from "@/constants/mock-session-join";
import { cn } from "@/lib/utils";
import { SessionQueueStatusBadge } from "../session-queue-status-badge/SessionQueueStatusBadge";

export type SessionQueueRosterProps = {
	players: SessionQueuePlayer[];
	summary: string;
	className?: string;
};

export function SessionQueueRoster({
	players,
	summary,
	className,
}: SessionQueueRosterProps) {
	return (
		<section className={cn("flex flex-col", className)}>
			<div className="flex items-center justify-between gap-3">
				<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
					QUEUE
				</p>
				<p className="text-micro text-text-secondary">{summary}</p>
			</div>
			<ul className="mt-3 divide-y divide-border">
				{players.map((player) => (
					<li key={player.id} className="flex items-center gap-3 py-3">
						<div
							className={cn(
								"flex size-10 shrink-0 items-center justify-center rounded-full text-label font-bold",
								player.highlight
									? "bg-accent text-bg-base"
									: "bg-bg-elevated text-text-primary",
							)}
							aria-hidden
						>
							{player.initials}
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate text-small font-semibold text-text-primary">
								{player.name}
							</p>
							<p className="truncate text-micro text-text-secondary">
								{player.subtitle}
							</p>
						</div>
						<SessionQueueStatusBadge status={player.status} />
					</li>
				))}
			</ul>
		</section>
	);
}

SessionQueueRoster.displayName = "SessionQueueRoster";
