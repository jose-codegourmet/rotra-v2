"use client";

import Link from "next/link";

import { NotificationItem } from "@/components/modules/notifications/notification-item/NotificationItem";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu/DropdownMenu";
import type { Notification } from "@/constants/mock-notifications";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_HREF = "/notifications";

export interface NotificationDropdownItemProps {
	notification: Notification;
	/** Defaults to /notifications */
	href?: string;
	className?: string;
}

export function NotificationDropdownItem({
	notification,
	href = NOTIFICATIONS_HREF,
	className,
}: NotificationDropdownItemProps) {
	return (
		<DropdownMenuItem
			className={cn(
				"cursor-pointer rounded-none px-0 py-0 focus:bg-bg-elevated data-[highlighted]:bg-bg-elevated",
				className,
			)}
			onSelect={(event) => event.preventDefault()}
			asChild
		>
			<Link href={href} className="block w-full outline-none">
				<NotificationItem
					notification={notification}
					compact
					className="rounded-none px-3 py-2"
				/>
			</Link>
		</DropdownMenuItem>
	);
}

NotificationDropdownItem.displayName = "NotificationDropdownItem";
