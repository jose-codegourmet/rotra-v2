import { cva } from "class-variance-authority";

export const venuePinVariants = cva(
	"relative flex items-center justify-center rounded-full border-4 border-bg-base transition-all duration-200",
	{
		variants: {
			variant: {
				live: "size-11 bg-accent text-bg-base shadow-[0_0_12px_rgba(0,255,136,0.7)]",
				upcoming: "size-9 bg-bg-elevated text-text-secondary",
			},
			full: {
				true: "opacity-60 grayscale",
				false: "",
			},
			selected: {
				true: "scale-110 shadow-[0_0_16px_rgba(0,255,136,0.9)]",
				false: "",
			},
		},
		defaultVariants: {
			variant: "upcoming",
			full: false,
			selected: false,
		},
	},
);

export const venuePinCountBadgeVariants = cva(
	"absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-bg-base bg-accent text-[10px] font-black text-bg-base",
);
