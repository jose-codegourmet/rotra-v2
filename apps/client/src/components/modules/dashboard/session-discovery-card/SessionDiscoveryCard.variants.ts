import { cva } from "class-variance-authority";

export const sessionDiscoveryCardVariants = cva(
	"rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
	{
		variants: {
			variant: {
				compact: "w-full bg-transparent p-0",
				list: "flex flex-row items-center justify-between gap-4 bg-bg-surface p-4",
				grid: "flex h-full flex-col gap-3 bg-bg-elevated p-4",
			},
			compactLayout: {
				full: "flex flex-col gap-2",
				row: "flex flex-row items-center gap-2 py-2",
			},
		},
		compoundVariants: [
			{
				variant: "compact",
				compactLayout: "full",
				className: "flex flex-col gap-2",
			},
			{
				variant: "compact",
				compactLayout: "row",
				className: "flex flex-row items-center gap-2 py-2",
			},
		],
		defaultVariants: {
			variant: "grid",
			compactLayout: "full",
		},
	},
);

export const sessionDiscoveryStatusBadgeVariants = cva(
	"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
	{
		variants: {
			status: {
				live: "bg-accent/20 text-accent",
				open: "bg-bg-overlay text-text-secondary",
				upcoming: "bg-bg-overlay text-text-secondary",
			},
		},
		defaultVariants: {
			status: "open",
		},
	},
);
