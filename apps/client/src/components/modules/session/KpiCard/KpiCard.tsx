import { cn } from "@/lib/utils";

export interface KpiCardProps {
	label: string;
	value: string;
	hint?: string;
	className?: string;
}

export function KpiCard({ label, value, hint, className }: KpiCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg bg-bg-surface px-4 py-3 min-w-[140px] flex flex-col gap-1",
				className,
			)}
		>
			<p className="text-micro font-bold uppercase tracking-widest text-text-disabled">
				{label}
			</p>
			<p className="text-heading font-bold text-text-primary tracking-tight">
				{value}
			</p>
			{hint ? (
				<p className="text-small text-accent font-semibold uppercase tracking-wide">
					{hint}
				</p>
			) : null}
		</div>
	);
}
