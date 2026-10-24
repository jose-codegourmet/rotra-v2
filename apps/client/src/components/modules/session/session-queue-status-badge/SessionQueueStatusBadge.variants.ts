import { cva, type VariantProps } from "class-variance-authority";

export const sessionQueueStatusBadgeVariants = cva(
	"inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
	{
		variants: {
			status: {
				accepted: "border-accent text-accent",
				waitlisted: "border-warning text-warning",
				reserved: "border-border-strong text-text-secondary",
			},
		},
		defaultVariants: {
			status: "accepted",
		},
	},
);

export type SessionQueueStatusBadgeVariants = VariantProps<
	typeof sessionQueueStatusBadgeVariants
>;
