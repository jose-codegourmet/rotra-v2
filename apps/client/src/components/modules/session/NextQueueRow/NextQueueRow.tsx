import { MoreHorizontal, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button/Button";
import type { NextQueueItem } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

export interface NextQueueRowProps {
	item: NextQueueItem;
	className?: string;
	onRocket?: () => void;
	onMore?: () => void;
}

export function NextQueueRow({
	item,
	className,
	onRocket,
	onMore,
}: NextQueueRowProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg bg-bg-surface px-3 py-3 min-h-[56px]",
				className,
			)}
		>
			<span className="text-micro font-bold uppercase tracking-widest text-text-disabled shrink-0 px-2 py-0.5 rounded bg-bg-elevated">
				{item.label}
			</span>
			<p className="flex-1 text-small font-semibold text-text-primary uppercase tracking-wide truncate">
				{item.matchup}
			</p>
			<span className="text-micro font-bold uppercase tracking-widest text-accent shrink-0">
				{item.waitLabel}
			</span>
			<div className="flex items-center gap-1 shrink-0">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="text-accent"
					aria-label="Prioritize"
					onClick={onRocket}
				>
					<Rocket className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="More"
					onClick={onMore}
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</div>
		</div>
	);
}
