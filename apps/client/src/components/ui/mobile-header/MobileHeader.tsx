"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { NotificationsBadge } from "@/components/ui/notifications-badge/NotificationsBadge";
import { useAppDispatch } from "@/store/hooks";
import { toggleMobileDrawer } from "@/store/slices/uiSlice";

type MobileHeaderProps = {
	unreadCount?: number;
};

export function MobileHeader({ unreadCount = 0 }: MobileHeaderProps) {
	const dispatch = useAppDispatch();

	return (
		<header className="flex md:hidden justify-between items-center px-6 py-4 w-full bg-bg-base/80 backdrop-blur-xl fixed top-0 z-50 border-b border-border">
			{/* Left: hamburger + wordmark */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					aria-label="Open navigation menu"
					className="text-accent active:scale-95 transition-transform"
					onClick={() => dispatch(toggleMobileDrawer())}
				>
					<Menu size={24} strokeWidth={1.5} />
				</button>
				<span className="text-title font-black italic text-accent tracking-tighter">
					ROTRA
				</span>
			</div>

			{/* Right: notifications + search */}
			<div className="flex items-center gap-4">
				<Link
					href="/notifications"
					className="relative flex size-10 shrink-0 items-center justify-center text-text-primary transition-colors duration-default hover:text-accent"
					aria-label="Notifications"
				>
					<Bell size={20} strokeWidth={1.5} aria-hidden />
					<span className="pointer-events-none absolute -right-0.5 -top-0.5 flex items-center justify-center">
						<NotificationsBadge count={unreadCount} size="sm" />
					</span>
				</Link>
				<button
					type="button"
					aria-label="Search"
					className="text-text-primary hover:text-accent transition-colors duration-default"
				>
					<Search size={20} strokeWidth={1.5} />
				</button>
			</div>
		</header>
	);
}
