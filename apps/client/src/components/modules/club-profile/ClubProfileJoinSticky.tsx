"use client";

import { cn } from "@/lib/utils";

export function ClubProfileJoinSticky({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"fixed bottom-20 md:bottom-0 left-0 right-0 md:left-20 lg:left-64 bg-bg-surface border-t border-border p-4 z-10",
				className,
			)}
		>
			<button
				type="button"
				className="w-full h-12 flex items-center justify-center text-small font-black uppercase tracking-widest text-bg-base bg-accent rounded-md"
			>
				Request to Join
			</button>
		</div>
	);
}
