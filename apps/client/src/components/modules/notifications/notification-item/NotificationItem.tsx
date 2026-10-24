"use client";

import { Slot } from "@radix-ui/react-slot";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import * as React from "react";

import type { Notification } from "@/constants/mock-notifications";
import { cn } from "@/lib/utils";

import {
	notificationItemContainerVariants,
	notificationItemIconVariants,
} from "./NotificationItem.variants";

const SEVERITY_ICON = {
	urgent: ShieldAlert,
	warning: AlertTriangle,
	info: null,
} as const;

export type NotificationItemProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	notification: Notification;
	/** When true, clamp message to two lines (dropdown preview). */
	compact?: boolean;
	asChild?: boolean;
};

export const NotificationItem = React.forwardRef<
	HTMLDivElement,
	NotificationItemProps
>(
	(
		{ className, notification, compact = false, asChild = false, ...props },
		ref,
	) => {
		const Comp = asChild ? Slot : "div";
		const isUnread = notification.unread;
		const state = isUnread ? "unread" : "read";
		const severity = notification.severity;
		const SeverityIcon = SEVERITY_ICON[severity];

		return (
			<Comp
				ref={ref}
				className={cn(
					notificationItemContainerVariants({ severity, state }),
					isUnread ? "text-text-primary" : "text-text-secondary",
					className,
				)}
				{...props}
			>
				<div className="flex items-start gap-2">
					{SeverityIcon ? (
						<SeverityIcon
							aria-hidden
							strokeWidth={1.75}
							className={notificationItemIconVariants({ severity, state })}
						/>
					) : null}
					<div className="min-w-0 flex-1 space-y-0.5">
						<p className="text-small font-semibold leading-snug">
							{notification.title}
						</p>
						<p
							className={cn(
								"text-small leading-snug text-text-secondary",
								compact && "line-clamp-2",
							)}
						>
							{notification.message}
						</p>
						<p className="text-micro text-text-disabled">{notification.time}</p>
					</div>
				</div>
			</Comp>
		);
	},
);

NotificationItem.displayName = "NotificationItem";
