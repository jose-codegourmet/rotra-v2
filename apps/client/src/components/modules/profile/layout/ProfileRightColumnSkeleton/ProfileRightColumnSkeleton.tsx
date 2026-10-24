import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { cn } from "@/lib/utils";

interface ProfileRightColumnSkeletonProps {
	className?: string;
}

export function ProfileRightColumnSkeleton({
	className,
}: ProfileRightColumnSkeletonProps) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Loading profile"
			className={cn("flex flex-col gap-8", className)}
		>
			<section className="grid grid-cols-3 gap-4" aria-hidden="true">
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={`stat-${i}`}
						className={cn(
							"bg-bg-surface p-6 rounded-xl",
							(i === 2 || i === 5) &&
								"border border-accent/20 shadow-[0_0_20px_rgba(0,255,136,0.05)]",
						)}
					>
						<Skeleton className="h-3 w-24 mb-2" />
						<div className="flex items-baseline gap-2">
							<Skeleton className="h-10 w-[4.5rem]" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				))}
			</section>

			<section className="bg-bg-surface rounded-xl p-8 overflow-hidden relative">
				<div className="flex justify-between items-start mb-8 gap-4">
					<div className="flex flex-col gap-2 min-w-0">
						<Skeleton className="h-7 max-w-[14rem]" />
						<Skeleton className="h-3 max-w-[22rem]" />
					</div>
					<Skeleton className="h-12 w-36 rounded-lg border border-white/5 bg-bg-elevated shrink-0" />
				</div>

				<div className="flex flex-col lg:flex-row items-center gap-12">
					<Skeleton
						className="w-full max-w-[260px] aspect-square shrink-0 rounded-full mx-auto lg:mx-0 bg-bg-elevated"
						aria-hidden="true"
					/>
					<div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8 w-full">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={`skill-bar-${i}`} className="flex flex-col gap-1">
								<div className="flex justify-between gap-2">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-3 w-6 shrink-0" />
								</div>
								<div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
									<Skeleton className="h-full w-[65%] rounded-full" />
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<section>
				<div className="flex justify-between items-end mb-6 gap-4">
					<Skeleton className="h-3 w-52" />
					<Skeleton className="h-3 w-32 shrink-0" />
				</div>
				<div className="flex flex-col gap-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`match-${i}`}
							className="bg-bg-surface p-4 rounded-xl flex items-center justify-between gap-4"
							aria-hidden="true"
						>
							<div className="flex items-center gap-6 min-w-0 flex-1">
								<Skeleton className="size-12 rounded-lg bg-bg-elevated shrink-0" />
								<div className="flex items-center gap-4 flex-1 min-w-0">
									<div className="flex flex-col gap-1 shrink-0">
										<Skeleton className="h-4 w-28 ml-auto" />
										<Skeleton className="h-2 w-16 ml-auto" />
									</div>
									<Skeleton className="h-8 min-w-[4rem] px-2 rounded bg-bg-overlay shrink-0" />
									<div className="flex flex-col gap-1 min-w-0">
										<Skeleton className="h-4 max-w-[8rem]" />
										<Skeleton className="h-2 w-20" />
									</div>
								</div>
							</div>
							<div className="flex items-center gap-6 shrink-0">
								<div className="flex flex-col gap-1 text-right">
									<Skeleton className="h-3 w-16 ml-auto" />
									<Skeleton className="h-2 w-24 ml-auto" />
								</div>
								<Skeleton className="size-5 rounded-full shrink-0" />
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="bg-bg-surface rounded-xl p-8">
				<Skeleton className="h-3 w-52 mb-6" />
				<div className="grid grid-cols-2 gap-x-12 gap-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={`metric-${i}`}
							className="flex justify-between items-center py-3 border-b border-white/5 gap-4"
							aria-hidden="true"
						>
							<Skeleton className="h-3 max-w-[10rem] flex-1" />
							<Skeleton className="h-4 w-28 shrink-0" />
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
