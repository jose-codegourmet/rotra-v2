import type { StandingRow } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

export interface SessionStandingViewProps {
	title?: string;
	rows: StandingRow[];
	className?: string;
}

export function SessionStandingView({
	title = "Current ranking",
	rows,
	className,
}: SessionStandingViewProps) {
	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<h2 className="text-display font-bold text-text-primary tracking-tight">
				{title}
			</h2>
			<div className="rounded-lg bg-bg-surface border border-border overflow-x-auto">
				<div className="min-w-[640px]">
					<div className="grid grid-cols-[48px_1fr_56px_56px_1fr_72px] gap-2 px-4 py-3 text-micro font-bold uppercase tracking-widest text-text-disabled border-b border-border">
						<span>#</span>
						<span>Player</span>
						<span className="text-center">Wins</span>
						<span className="text-center">Lose</span>
						<span>Win %</span>
						<span className="text-right">Trend</span>
					</div>
					<div className="flex flex-col">
						{rows.map((row) => (
							<div
								key={row.rank}
								className={cn(
									"grid grid-cols-[48px_1fr_56px_56px_1fr_72px] gap-2 px-4 py-3 items-center text-small border-b border-border last:border-0",
									row.highlight && "bg-accent/10",
								)}
							>
								<span className="font-bold text-text-secondary tabular-nums">
									{String(row.rank).padStart(2, "0")}
								</span>
								<span className="font-semibold text-text-primary truncate">
									{row.name}
								</span>
								<span className="text-center text-text-secondary tabular-nums">
									{row.wins}
								</span>
								<span className="text-center text-text-secondary tabular-nums">
									{row.losses}
								</span>
								<div className="min-w-0 flex items-center gap-2">
									<div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
										<div
											className="h-full rounded-full bg-accent"
											style={{ width: `${row.winPct}%` }}
										/>
									</div>
									<span className="text-micro text-text-disabled w-10 text-right tabular-nums">
										{row.winPct}%
									</span>
								</div>
								<span className="text-right text-accent text-micro font-bold">
									▲
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
