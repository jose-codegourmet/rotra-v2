import Image from "next/image";
import { cn } from "@/lib/utils";

interface PlayerIdentityProps {
	name: string;
	initials: string;
	level: string;
	badge?: string;
	imageUrl?: string;
	disabled?: boolean;
	className?: string;
}

export function PlayerIdentity({
	name,
	initials,
	level,
	badge,
	imageUrl,
	disabled = false,
	className,
}: PlayerIdentityProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-6 mb-6",
				disabled && "opacity-50 grayscale pointer-events-none",
				className,
			)}
		>
			<div className="relative shrink-0">
				<div
					className={cn(
						"w-20 h-20 rounded-lg bg-bg-elevated flex items-center justify-center ring-2 ring-offset-4 ring-offset-bg-surface shadow-accent overflow-hidden",
						disabled ? "ring-white/10" : "ring-accent/20",
					)}
				>
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={name}
							width={80}
							height={80}
							className="object-cover w-full h-full"
						/>
					) : (
						<span className="text-[22px] font-black text-text-secondary uppercase tracking-tight">
							{initials}
						</span>
					)}
				</div>

				{badge && (
					<div
						className={cn(
							"absolute -bottom-2 -right-2 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-card",
							disabled
								? "bg-text-disabled text-bg-base"
								: "bg-accent text-bg-base",
						)}
					>
						{badge}
					</div>
				)}
			</div>

			<div>
				<h2 className="text-2xl font-black tracking-[-0.05em] uppercase text-text-primary">
					{name}
				</h2>
				<p
					className={cn(
						"text-[12px] font-bold uppercase tracking-widest mt-1",
						disabled ? "text-text-disabled" : "text-accent",
					)}
				>
					{level}
				</p>
			</div>
		</div>
	);
}
