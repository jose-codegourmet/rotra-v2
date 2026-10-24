import { cva, type VariantProps } from "class-variance-authority";

export const notificationItemContainerVariants = cva(
	"relative flex w-full min-w-0 flex-col gap-1 rounded-md border-l-2 px-3 py-2 text-left transition-colors duration-default",
	{
		variants: {
			severity: {
				urgent: "border-l-error",
				warning: "border-l-warning",
				info: "border-l-transparent",
			},
			state: {
				unread: "",
				read: "",
			},
		},
		compoundVariants: [
			{
				severity: "urgent",
				state: "unread",
				className: "animate-notification-urgent-bg",
			},
			{
				severity: "warning",
				state: "unread",
				className: "bg-warning/[0.06]",
			},
		],
		defaultVariants: {
			severity: "info",
			state: "unread",
		},
	},
);

export type NotificationItemContainerVariants = VariantProps<
	typeof notificationItemContainerVariants
>;

export const notificationItemIconVariants = cva("mt-0.5 size-4 shrink-0", {
	variants: {
		severity: {
			urgent: "text-error",
			warning: "text-warning",
			info: "hidden",
		},
		state: {
			unread: "",
			read: "opacity-50",
		},
	},
	defaultVariants: {
		severity: "info",
		state: "unread",
	},
});

export type NotificationItemIconVariants = VariantProps<
	typeof notificationItemIconVariants
>;
