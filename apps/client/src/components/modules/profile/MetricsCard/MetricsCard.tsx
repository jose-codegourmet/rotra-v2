import { ADVANCED_STATS } from "@/constants/mock-player";

export function MetricsCard() {
	return (
		<section className="bg-bg-surface rounded-xl p-8">
			<h3 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-6">
				Advanced Synergy Metrics
			</h3>
			<div className="grid grid-cols-2 gap-x-12 gap-y-3">
				{ADVANCED_STATS.map((row) => (
					<div
						key={row.label}
						className="flex justify-between items-center py-3 border-b border-white/5"
					>
						<span className="text-[11px] text-text-secondary uppercase tracking-wider">
							{row.label}
						</span>
						<span className="text-sm font-bold text-text-primary">
							{row.value}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
