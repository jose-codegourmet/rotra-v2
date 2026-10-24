"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChipOption = {
	v: string;
	label: string;
	icon?: LucideIcon;
};

type ChipRowProps = {
	value: string;
	onChange: (value: string) => void;
	options: ChipOption[];
};

export function ChipRow({ value, onChange, options }: ChipRowProps) {
	const rich = options.some((o) => o.icon);

	return (
		<div className={cn("flex flex-col gap-3", rich && "md:gap-4")}>
			{options.map((opt) => {
				const Icon = opt.icon;
				const selected = value === opt.v;

				return (
					<button
						key={opt.v}
						type="button"
						onClick={() => onChange(opt.v)}
						className={cn(
							"w-full rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface",
							"min-h-[44px]",
							Icon && "group",
							rich &&
								"flex items-center justify-between gap-3 p-4 md:p-6 md:focus-visible:ring-offset-bg-surface",
							!rich && "p-3 text-body",
							selected && rich && "shadow-[0_0_24px_rgba(0,255,136,0.08)]",
							selected && !rich && "border-accent bg-accent/10 text-accent",
							selected &&
								rich &&
								"border-accent bg-bg-elevated text-accent md:bg-bg-elevated",
							!selected &&
								!rich &&
								"border-border bg-bg-surface text-text-primary hover:bg-bg-elevated",
							!selected &&
								rich &&
								"border-border bg-bg-surface text-text-primary hover:border-accent/30 hover:bg-bg-elevated md:border-white/5",
						)}
					>
						<div
							className={cn(
								"flex min-w-0 flex-1 items-center gap-3 md:gap-4",
								!Icon && !rich && "w-full",
							)}
						>
							{Icon ? (
								<div
									className={cn(
										"flex size-9 shrink-0 items-center justify-center rounded-full transition-colors md:size-10",
										selected
											? "bg-accent/20"
											: "bg-bg-base group-hover:bg-accent/10",
									)}
								>
									<Icon
										className={cn(
											"size-5",
											selected
												? "text-accent"
												: "text-text-secondary md:group-hover:text-accent",
										)}
										strokeWidth={2}
										aria-hidden
									/>
								</div>
							) : null}
							<span
								className={cn(
									!rich && "text-body",
									rich &&
										"truncate font-bold tracking-tight md:text-lg md:uppercase md:tracking-tight",
									selected && rich && "text-accent",
									!selected && rich && "text-text-primary",
								)}
							>
								{opt.label}
							</span>
						</div>
						{Icon ? (
							<div
								className={cn(
									"flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
									selected
										? "border-accent bg-accent"
										: "border-border md:border-border-strong",
								)}
								aria-hidden
							>
								{selected ? (
									<span className="size-2 rounded-full bg-bg-base" />
								) : null}
							</div>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
