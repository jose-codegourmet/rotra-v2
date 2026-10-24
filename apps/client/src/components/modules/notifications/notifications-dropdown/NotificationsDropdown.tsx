"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

import { NotificationDropdownItem } from "@/components/modules/notifications/notifications-dropdown/notification-dropdown-item/NotificationDropdownItem";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import { NotificationsBadge } from "@/components/ui/notifications-badge/NotificationsBadge";
import type { Notification } from "@/constants/mock-notifications";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;
const NOTIFICATIONS_HREF = "/notifications";

export interface NotificationsDropdownProps {
	notifications: Notification[];
	unreadCount: number;
	className?: string;
}

export function NotificationsDropdown({
	notifications,
	unreadCount,
	className,
}: NotificationsDropdownProps) {
	const preview = notifications.slice(0, PREVIEW_LIMIT);

	return (
		<div className={cn("relative shrink-0", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Open notifications menu"
						className={cn(
							"relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-text-secondary transition-colors duration-default",
							"outline-none hover:bg-bg-overlay hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
						)}
					>
						<Bell className="size-5" strokeWidth={1.5} aria-hidden />
						<span className="pointer-events-none absolute -right-0.5 -top-0.5 flex items-center justify-center">
							<NotificationsBadge count={unreadCount} size="sm" />
						</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-[min(22rem,calc(100vw-2rem))] p-0"
					align="end"
				>
					<DropdownMenuLabel className="border-b border-border px-4 py-3">
						Notifications
					</DropdownMenuLabel>
					{notifications.length === 0 ? (
						<p className="px-4 py-6 text-center text-small text-text-secondary">
							You&apos;re all caught up.
						</p>
					) : (
						<>
							<ul className="max-h-[min(40vh,280px)] divide-y divide-border overflow-y-auto">
								{preview.map((n) => (
									<li key={n.id}>
										<NotificationDropdownItem notification={n} />
									</li>
								))}
							</ul>
							<DropdownMenuSeparator />
							<div className="p-1">
								<DropdownMenuItem asChild>
									<Link
										href={NOTIFICATIONS_HREF}
										className="cursor-pointer justify-center text-accent"
									>
										View all
									</Link>
								</DropdownMenuItem>
							</div>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

NotificationsDropdown.displayName = "NotificationsDropdown";
