"use client";

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import {
	type NotificationsBadgeVariants,
	notificationsBadgeVariants,
} from "./NotificationsBadge.variants";

function formatNotificationsCount(count: number, max: number): string {
	if (count <= max) return String(count);
	return `${max}+`;
}

export type NotificationsBadgeProps = Omit<
	HTMLAttributes<HTMLSpanElement>,
	"children"
> &
	NotificationsBadgeVariants & {
		count: number;
		max?: number;
		/** Overrides auto-generated label for screen readers */
		"aria-label"?: string;
	};

export function NotificationsBadge({
	className,
	count,
	max = 99,
	size,
	tone,
	"aria-label": ariaLabelProp,
	...props
}: NotificationsBadgeProps) {
	if (count <= 0) return null;

	const label =
		ariaLabelProp ??
		`${count > max ? `${max}+` : count} unread notification${count === 1 ? "" : "s"}`;

	return (
		<span
			role="status"
			aria-label={label}
			className={cn(notificationsBadgeVariants({ size, tone }), className)}
			{...props}
		>
			{formatNotificationsCount(count, max)}
		</span>
	);
}

NotificationsBadge.displayName = "NotificationsBadge";
