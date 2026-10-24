import type { PlayerRosterStatus } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

const variantClass: Record<PlayerRosterStatus, string> = {
	playing: "bg-accent text-bg-base",
	waiting: "bg-bg-elevated text-text-secondary",
	ready: "bg-bg-overlay text-text-primary border border-border",
	away: "bg-bg-elevated text-error",
};

export interface StatusPillProps {
	status: PlayerRosterStatus;
	children: React.ReactNode;
	className?: string;
}

export function StatusPill({ status, children, className }: StatusPillProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
				variantClass[status],
				className,
			)}
		>
			{children}
		</span>
	);
}
