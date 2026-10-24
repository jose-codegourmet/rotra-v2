export function DashboardSkeleton() {
	return (
		<div className="flex h-full w-full items-center justify-center bg-bg-elevated">
			<div className="flex flex-col items-center gap-3">
				<div className="size-10 animate-pulse rounded-full bg-bg-overlay" />
				<p className="text-micro font-bold uppercase tracking-widest text-text-disabled">
					Loading map…
				</p>
			</div>
		</div>
	);
}
