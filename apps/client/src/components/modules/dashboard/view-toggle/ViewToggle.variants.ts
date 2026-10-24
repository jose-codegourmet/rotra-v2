import { cva } from "class-variance-authority";

export const viewToggleTabVariants = cva(
	"flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
	{
		variants: {
			active: {
				true: "bg-accent text-bg-base shadow-md",
				false: "text-text-secondary hover:bg-bg-elevated",
			},
		},
		defaultVariants: {
			active: false,
		},
	},
);
