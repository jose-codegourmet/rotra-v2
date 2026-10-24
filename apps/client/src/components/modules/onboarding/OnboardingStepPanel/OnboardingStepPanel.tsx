"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type OnboardingStepPanelProps = {
	children: ReactNode;
	className?: string;
};

/** Desktop-only editorial card; mobile stays visually unchanged (no heavy chrome). */
export function OnboardingStepPanel({
	children,
	className,
}: OnboardingStepPanelProps) {
	return (
		<div
			className={cn(
				"relative flex w-full flex-1 flex-col",
				"md:overflow-hidden md:rounded-xl md:border md:border-white/5 md:bg-bg-surface/90 md:px-8 md:py-10 md:shadow-2xl md:backdrop-blur-xl",
				"lg:px-12 lg:py-12",
				className,
			)}
		>
			<div
				className="pointer-events-none absolute right-3 top-3 hidden h-12 w-12 rounded-tr-lg border-t border-r border-accent/20 md:block"
				aria-hidden
			/>
			<div
				className="pointer-events-none absolute bottom-3 left-3 hidden h-12 w-12 rounded-bl-lg border-b border-l border-accent/20 md:block"
				aria-hidden
			/>
			<div className="relative z-[1]">{children}</div>
		</div>
	);
}
