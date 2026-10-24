"use client";

import { Calendar, ChevronRight, Play, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickSessionButtonProps {
	disabled?: boolean;
	variant?: "create" | "scheduled" | "resume";
	onClick: () => void;
	className?: string;
}

const VARIANT_CONFIG = {
	create: {
		icon: Plus,
		microLabel: "SCHEDULE SESSION",
		mainLabel: "START QUICK SESSION",
		ariaLabel: "Start a quick session",
		muted: false,
	},
	scheduled: {
		icon: Calendar,
		microLabel: "UPCOMING SESSION",
		mainLabel: "VIEW SESSION",
		ariaLabel: "View your upcoming session",
		muted: true,
	},
	resume: {
		icon: Play,
		microLabel: "ACTIVE SESSION",
		mainLabel: "RESUME SESSION",
		ariaLabel: "Resume your active session",
		muted: false,
	},
} as const;

export function QuickSessionButton({
	disabled = false,
	variant = "create",
	onClick,
	className,
}: QuickSessionButtonProps) {
	const config = VARIANT_CONFIG[variant];
	const Icon = config.icon;

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"pointer-events-auto group absolute bottom-10 left-10 z-30",
				"flex items-center gap-3 rounded-full",
				config.muted
					? "border border-outline-variant/20 bg-bg-surface/95 shadow-md hover:bg-bg-elevated hover:pr-6"
					: "border border-accent/20 bg-bg-surface shadow-[0_0_40px_rgba(0,255,136,0.15)] hover:bg-accent hover:pr-8",
				"pr-4 pl-1 py-1",
				"transition-all duration-300",
				"disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			aria-label={config.ariaLabel}
		>
			<span
				className={cn(
					"flex size-14 shrink-0 items-center justify-center rounded-full",
					config.muted
						? "bg-bg-elevated text-text-secondary"
						: "bg-gradient-to-br from-accent to-accent-dim text-bg-base group-hover:from-bg-base group-hover:to-bg-base group-hover:text-accent",
				)}
			>
				<Icon className="size-6" strokeWidth={2.5} aria-hidden="true" />
			</span>
			<span className="flex min-w-0 flex-col items-start text-left">
				<span
					className={cn(
						"text-[10px] font-bold uppercase tracking-[0.2em]",
						config.muted
							? "text-text-secondary"
							: "text-accent-dim group-hover:text-bg-base/80",
					)}
				>
					{config.microLabel}
				</span>
				<span
					className={cn(
						"text-sm font-black tracking-tight text-text-primary",
						!config.muted && "group-hover:text-bg-base",
					)}
				>
					{config.mainLabel}
				</span>
			</span>
			<ChevronRight
				className={cn(
					"size-4 shrink-0 opacity-0 transition-opacity duration-300",
					config.muted
						? "text-text-secondary group-hover:opacity-100"
						: "text-bg-base group-hover:opacity-100",
				)}
				aria-hidden="true"
			/>
		</button>
	);
}
