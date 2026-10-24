"use client";

import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { cn } from "@/lib/utils";

export function ClubApplicationApplySkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<div
			className={cn("space-y-4", className)}
			role="status"
			aria-busy
			aria-label="Loading application form"
		>
			<Skeleton className="h-4 w-24" />
			<Skeleton className="h-10 w-full max-w-md" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-40" />
		</div>
	);
}
