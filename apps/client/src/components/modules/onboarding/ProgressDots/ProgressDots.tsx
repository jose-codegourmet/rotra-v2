"use client";

import { cn } from "@/lib/utils";

type ProgressDotsProps = {
	currentStep: number;
	totalSteps?: number;
};

export function ProgressDots({
	currentStep,
	totalSteps = 8,
}: ProgressDotsProps) {
	if (currentStep < 1) return null;

	const pct = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

	return (
		<div
			className={cn(
				"border-b border-border px-4 py-3 md:border-white/10 md:py-3.5",
				"md:bg-bg-base/25 md:backdrop-blur-sm",
			)}
		>
			<div className="flex items-center justify-end gap-1.5 md:hidden w-full">
				{Array.from({ length: totalSteps }, (_, i) => {
					const idx = i + 1;
					const active = currentStep === idx;
					const done = currentStep > idx;
					return (
						<span
							key={idx}
							className={cn(
								"size-2 rounded-full",
								active && "bg-accent",
								done && !active && "bg-accent-dim",
								!done && !active && "bg-bg-elevated",
							)}
							aria-hidden
						/>
					);
				})}
			</div>

			<div className="mx-auto hidden max-w-2xl items-center gap-4 md:flex md:px-2">
				<span className="shrink-0 font-black text-[10px] uppercase tracking-widest text-text-secondary">
					Step {currentStep} of {totalSteps}
				</span>
				<div
					className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-elevated"
					role="progressbar"
					aria-valuenow={currentStep}
					aria-valuemin={1}
					aria-valuemax={totalSteps}
					aria-label={`Onboarding step ${currentStep} of ${totalSteps}`}
				>
					<div
						className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>
		</div>
	);
}
