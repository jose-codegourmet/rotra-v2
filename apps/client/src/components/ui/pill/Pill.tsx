import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const pillVariants = cva(
	"inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-normal uppercase tracking-widest transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
	{
		variants: {
			variant: {
				accent: "border-transparent bg-accent/15 text-accent",
				muted: "border-transparent bg-bg-elevated text-text-disabled",
				outline: "border-border bg-transparent text-text-secondary",
				superAdmin: "border-transparent bg-accent/20 text-accent font-semibold",
				platformAdmin: "border-border bg-bg-elevated/80 text-text-secondary",
			},
		},
		defaultVariants: {
			variant: "accent",
		},
	},
);

export type PillProps = React.HTMLAttributes<HTMLSpanElement> &
	VariantProps<typeof pillVariants>;

const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
	({ className, variant, ...props }, ref) => (
		<span
			ref={ref}
			className={cn(pillVariants({ variant, className }))}
			{...props}
		/>
	),
);
Pill.displayName = "Pill";

export { Pill, pillVariants };
