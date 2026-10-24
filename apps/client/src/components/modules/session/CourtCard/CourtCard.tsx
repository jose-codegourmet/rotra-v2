import { Plus } from "lucide-react";
import type { CourtCardData } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

export interface CourtCardProps {
	court: CourtCardData;
	className?: string;
	onAssignClick?: () => void;
}

export function CourtCard({ court, className, onAssignClick }: CourtCardProps) {
	if (court.variant === "empty") {
		return (
			<button
				type="button"
				onClick={onAssignClick}
				className={cn(
					"rounded-lg min-h-[140px] w-full flex flex-col items-center justify-center gap-2",
					"bg-bg-surface/80 border border-dashed border-border hover:border-accent hover:bg-bg-elevated transition-colors duration-default",
					"text-text-secondary hover:text-accent",
					className,
				)}
			>
				<span className="size-10 rounded-full bg-bg-elevated flex items-center justify-center text-accent">
					<Plus className="size-5" strokeWidth={2} />
				</span>
				<span className="text-label font-bold uppercase tracking-widest">
					Add queue / players
				</span>
			</button>
		);
	}

	const { teamA, teamB, progress = 0, league, label } = court;

	return (
		<div
			className={cn(
				"rounded-lg overflow-hidden flex flex-col bg-bg-surface",
				"shadow-[0_8px_24px_rgba(0,255,136,0.12)]",
				className,
			)}
		>
			<div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
				<div>
					<p className="text-label font-bold uppercase tracking-widest text-accent">
						{label}
					</p>
					{league ? (
						<p className="text-micro text-text-disabled uppercase tracking-wider mt-0.5">
							{league}
						</p>
					) : null}
				</div>
				<span className="text-micro font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
					Live
				</span>
			</div>

			<div className="px-3 grid grid-cols-2 gap-2 flex-1">
				<div className="rounded-md bg-bg-elevated p-2">
					<p className="text-micro text-text-disabled uppercase mb-1">Team A</p>
					<p className="text-small font-semibold text-text-primary leading-tight">
						{teamA?.names}
					</p>
				</div>
				<div className="rounded-md bg-bg-elevated p-2">
					<p className="text-micro text-text-disabled uppercase mb-1">Team B</p>
					<p className="text-small font-semibold text-text-primary leading-tight">
						{teamB?.names}
					</p>
				</div>
			</div>

			<div className="px-3 py-3 flex items-center justify-center gap-3">
				<span className="text-display font-black text-text-primary tabular-nums">
					{teamA?.score ?? 0}
				</span>
				<span className="text-text-disabled text-small font-bold">:</span>
				<span className="text-display font-black text-text-primary tabular-nums">
					{teamB?.score ?? 0}
				</span>
			</div>

			<div className="h-1 w-full bg-bg-elevated">
				<div
					className="h-full bg-accent transition-all duration-default"
					style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
				/>
			</div>
		</div>
	);
}
