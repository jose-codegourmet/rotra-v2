import { acceptedCapacity } from "@/lib/sessions/session-display-utils";
import { cn } from "@/lib/utils";

export type SessionCapacityCardProps = {
	accepted: number;
	courts: number;
	playersPerCourt: number;
	showSpotsOpen?: boolean;
	footnote?: string;
	className?: string;
};

export function SessionCapacityCard({
	accepted,
	courts,
	playersPerCourt,
	showSpotsOpen = false,
	footnote,
	className,
}: SessionCapacityCardProps) {
	const acceptedMax = acceptedCapacity(courts, playersPerCourt);
	const spotsOpen = Math.max(0, acceptedMax - accepted);
	const fillPercent =
		acceptedMax === 0 ? 0 : Math.min(100, (accepted / acceptedMax) * 100);

	return (
		<section
			className={cn(
				"rounded-xl border border-border bg-bg-surface p-4",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
					CAPACITY
				</p>
				<p className="text-small text-text-secondary">
					<span className="font-semibold text-accent">{accepted}</span>
					{`/${acceptedMax} accepted`}
				</p>
			</div>
			<div
				className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated"
				role="progressbar"
				aria-label="Accepted capacity"
				aria-valuemin={0}
				aria-valuemax={acceptedMax}
				aria-valuenow={accepted}
			>
				<div
					className="h-full rounded-full bg-accent transition-[width] duration-default"
					style={{ width: `${fillPercent}%` }}
				/>
			</div>
			<div className="mt-3 flex items-start justify-between gap-3 text-micro text-text-secondary">
				{showSpotsOpen ? (
					<p className="flex items-center gap-1.5 text-text-primary">
						<span
							className="size-1.5 shrink-0 rounded-full bg-accent"
							aria-hidden
						/>
						{spotsOpen} {spotsOpen === 1 ? "spot open" : "spots open"}
					</p>
				) : (
					<span />
				)}
				<p className="text-right">
					{acceptedMax} accepted max · rest waitlisted
				</p>
			</div>
			{footnote ? (
				<p className="mt-3 text-small text-text-secondary">{footnote}</p>
			) : null}
		</section>
	);
}

SessionCapacityCard.displayName = "SessionCapacityCard";
