import Link from "next/link";
import type { StandingRow } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

export interface StandingMiniTableProps {
	rows: StandingRow[];
	className?: string;
	viewAllHref?: string;
}

export function StandingMiniTable({
	rows,
	className,
	viewAllHref = "#",
}: StandingMiniTableProps) {
	return (
		<div
			className={cn(
				"rounded-lg bg-bg-surface p-3 flex flex-col gap-3",
				className,
			)}
		>
			<p className="text-label font-bold uppercase tracking-widest text-text-primary">
				Standing
			</p>
			<div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-micro uppercase tracking-wider text-text-disabled font-bold">
				<span>Name</span>
				<span className="text-center">Wins</span>
				<span className="text-center">Lose</span>
			</div>
			<div className="flex flex-col gap-2">
				{rows.map((row) => (
					<div
						key={row.rank}
						className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0 items-center text-small"
					>
						<span className="text-text-primary font-medium truncate">
							{row.name}
						</span>
						<span className="text-center text-text-secondary tabular-nums">
							{row.wins}
						</span>
						<span className="text-center text-text-secondary tabular-nums">
							{row.losses}
						</span>
					</div>
				))}
			</div>
			<Link
				href={viewAllHref}
				className="text-micro font-bold uppercase tracking-widest text-accent hover:underline mt-1"
			>
				View full ranking
			</Link>
		</div>
	);
}
