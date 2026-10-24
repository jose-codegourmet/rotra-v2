import type { PlayerQueueCardData } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

import { StatusPill } from "../StatusPill/StatusPill";

export interface PlayerQueueCardProps {
	player: PlayerQueueCardData;
	className?: string;
	selected?: boolean;
	onClick?: () => void;
}

export function PlayerQueueCard({
	player,
	className,
	selected,
	onClick,
}: PlayerQueueCardProps) {
	const interactive = Boolean(onClick) && !player.disabled;

	const body = (
		<>
			<div
				className="size-11 rounded-full bg-bg-elevated shrink-0 border border-border"
				aria-hidden
			/>
			<div className="min-w-0 flex-1 flex flex-col gap-1 text-left">
				<p className="text-small font-bold text-text-primary truncate">
					{player.name}
				</p>
				<p className="text-micro text-text-secondary">{player.recordLabel}</p>
				<div className="flex flex-wrap items-center gap-2 mt-1">
					<StatusPill status={player.status}>{player.statusLabel}</StatusPill>
				</div>
			</div>
		</>
	);

	const shellClass = cn(
		"rounded-lg p-3 flex gap-3 items-start transition-colors duration-default w-full",
		"bg-bg-surface",
		player.disabled && "opacity-45 pointer-events-none",
		interactive &&
			"cursor-pointer hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
		selected && "ring-2 ring-accent bg-bg-elevated",
		className,
	);

	if (interactive) {
		return (
			<button type="button" onClick={onClick} className={shellClass}>
				{body}
			</button>
		);
	}

	return <div className={shellClass}>{body}</div>;
}
