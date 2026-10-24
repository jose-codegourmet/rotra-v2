import { cva, type VariantProps } from "class-variance-authority";

export const switchVariants = cva(
	[
		"peer inline-flex shrink-0 items-center rounded-full border border-input bg-bg-elevated shadow-xs transition-all duration-default outline-none ",

		// checked
		"data-[state=checked]:border-primary",
		"data-[state=checked]:bg-primary",

		// unchecked
		"data-[state=unchecked]:bg-bg-elevated",

		// disabled
		"disabled:cursor-not-allowed",
		"disabled:opacity-50",

		// invalid
		"aria-invalid:border-destructive",
		"aria-invalid:ring-destructive/20",
		"aria-invalid:[&_[data-slot=switch-thumb]]:bg-error",

		// focus
		"focus-visible:border-ring",
		"focus-visible:ring-3",
		"focus-visible:ring-ring/50",

		// dark mode
		"dark:bg-input/30",
		"dark:aria-invalid:border-destructive/50",
		"dark:aria-invalid:ring-destructive/40",

		// dark mode unchecked
		"dark:data-[state=unchecked]:bg-input/40",
	],
	{
		variants: {
			size: {
				default: "h-5 w-9 p-0.5",
				sm: "h-4 w-8 p-0.5",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

export const switchThumbVariants = cva(
	[
		"pointer-events-none block rounded-full ring-0 shadow-xs transition-transform duration-default",

		// checked
		"data-[state=checked]:bg-accent",
		"data-[state=checked]:translate-x-4 ",

		// unchecked
		"data-[state=unchecked]:bg-bg-base",
		"data-[state=unchecked]:translate-x-0",

		// dark mode unchecked
		"dark:data-[state=unchecked]:bg-input/40",
	],
	{
		variants: {
			size: {
				default: "size-4",
				sm: "size-3",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

export type SwitchVariants = VariantProps<typeof switchVariants>;
