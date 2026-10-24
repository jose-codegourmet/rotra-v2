import { cn } from "@/lib/utils";

interface TierStripProps {
	tier: string;
	tierPips: { filled: number; total: number };
	className?: string;
}

export function TierStrip({ tier, tierPips, className }: TierStripProps) {
	return (
		<div
			className={cn(
				"bg-bg-elevated rounded-lg p-4 flex items-center justify-between",
				className,
			)}
		>
			<div className="flex flex-col">
				<span className="text-[10px] text-text-secondary uppercase tracking-widest mb-1">
					Current Tier
				</span>
				<span className="text-sm font-black uppercase tracking-tighter text-text-primary">
					{tier}
				</span>
			</div>
			<div className="flex gap-1">
				{Array.from({ length: tierPips.total }).map((_, i) => (
					<div
						key={`pip-${i}`}
						className={cn(
							"w-1.5 h-6 rounded-full",
							i < tierPips.filled ? "bg-accent" : "bg-white/10",
						)}
					/>
				))}
			</div>
		</div>
	);
}
