import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { cn } from "@/lib/utils";

interface ProfileLeftColumnSkeletonProps {
	className?: string;
}

export function ProfileLeftColumnSkeleton({
	className,
}: ProfileLeftColumnSkeletonProps) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Loading profile"
			className={cn("lg:sticky lg:top-24 flex flex-col gap-6", className)}
		>
			<div className="bg-bg-surface rounded-xl p-8 relative overflow-hidden">
				<Skeleton
					className="absolute top-4 right-4 size-10 rounded-md"
					aria-hidden="true"
				/>
				<div className="flex items-center gap-6 mb-6">
					<Skeleton
						className="size-20 rounded-lg ring-2 ring-offset-4 ring-offset-bg-surface ring-accent/20 shrink-0"
						aria-hidden="true"
					/>
					<div className="flex flex-col gap-3 min-w-0 flex-1">
						<Skeleton className="h-8 max-w-[12rem]" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
				<div className="bg-bg-elevated rounded-lg p-4 flex items-center justify-between gap-4">
					<div className="flex flex-col gap-2 min-w-0">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-5 w-32" />
					</div>
					<div className="flex gap-1 shrink-0" aria-hidden="true">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton
								key={`tier-pip-${i}`}
								className="w-1.5 h-6 rounded-full"
							/>
						))}
					</div>
				</div>
			</div>

			<div className="bg-bg-surface rounded-xl p-6">
				<div className="flex items-center gap-2 mb-4">
					<Skeleton className="size-[14px] rounded-sm shrink-0" />
					<Skeleton className="h-3 w-24" />
				</div>
				<div className="flex flex-wrap gap-2">
					<Skeleton className="h-7 w-40" />
					<Skeleton className="h-7 w-36" />
					<Skeleton className="h-7 w-32" />
				</div>
			</div>

			<div className="bg-bg-surface rounded-xl p-6">
				<div className="flex items-center gap-2 mb-4">
					<Skeleton className="size-[14px] rounded-sm shrink-0" />
					<Skeleton className="h-3 w-28" />
				</div>
				<div className="flex flex-col gap-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={`gear-row-${i}`}
							className="flex items-center gap-4 bg-bg-elevated p-3 rounded-lg border-l-2 border-accent"
						>
							<Skeleton
								className="size-10 rounded bg-bg-overlay shrink-0"
								aria-hidden="true"
							/>
							<div className="flex flex-col gap-2 min-w-0 flex-1">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 max-w-[14rem]" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
