import { cva, type VariantProps } from "class-variance-authority";

export const notificationsBadgeVariants = cva(
	"inline-flex min-w-[1.125rem] shrink-0 items-center justify-center rounded-full px-1 text-micro font-bold tabular-nums transition-colors duration-default",
	{
		variants: {
			size: {
				sm: "h-[18px] min-w-[18px] px-[5px] text-[10px] leading-none",
				md: "min-h-6 px-2 py-0.5 text-label leading-none",
			},
			tone: {
				accent: "bg-accent text-bg-base",
				muted: "bg-bg-overlay text-text-primary",
			},
		},
		defaultVariants: {
			size: "sm",
			tone: "accent",
		},
	},
);

export type NotificationsBadgeVariants = VariantProps<
	typeof notificationsBadgeVariants
>;
