import { cn } from "@/lib/utils";

export type SessionBrandHeaderProps = {
	status: string;
	className?: string;
};

export function SessionBrandHeader({
	status,
	className,
}: SessionBrandHeaderProps) {
	return (
		<header className={cn("pt-6", className)}>
			<div>
				<p className="text-heading font-bold uppercase tracking-wide text-text-primary">
					ROTRA
				</p>
				<p className="text-small text-text-secondary">Run the game.</p>
			</div>
			<p className="mt-5 flex items-center gap-2 text-micro font-medium uppercase tracking-widest text-text-secondary">
				<span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
				{status}
			</p>
		</header>
	);
}

SessionBrandHeader.displayName = "SessionBrandHeader";
