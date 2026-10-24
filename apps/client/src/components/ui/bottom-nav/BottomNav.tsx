"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationsBadge } from "@/components/ui/notifications-badge/NotificationsBadge";
import { NAV_ITEMS } from "@/constants/nav";
import { cn } from "@/lib/utils";

type BottomNavProps = {
	unreadCount?: number;
};

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
	const pathname = usePathname();
	const activeItem =
		NAV_ITEMS.find(
			(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
		)?.id ?? "home";

	return (
		<nav
			className="md:hidden flex justify-around items-center h-16 w-full fixed bottom-0 z-50 bg-bg-surface/80 backdrop-blur-xl border-t border-border rounded-t-lg shadow-[0_-8px_24px_rgba(0,255,136,0.08)]"
			aria-label="Bottom navigation"
		>
			{NAV_ITEMS.map(({ id, label, Icon, href }) => {
				const isActive = activeItem === id;
				return (
					<Link
						key={id}
						href={href}
						aria-label={label}
						className={cn(
							"relative flex flex-col items-center justify-center flex-1 h-full active:scale-90 transition-transform duration-fast",
							isActive ? "text-accent" : "text-text-disabled",
						)}
					>
						{isActive && (
							<span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full" />
						)}
						<span className="relative inline-flex items-center justify-center">
							<Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
							{id === "notifications" ? (
								<span className="pointer-events-none absolute -right-2 -top-1 flex items-center justify-center">
									<NotificationsBadge count={unreadCount} size="sm" />
								</span>
							) : null}
						</span>
					</Link>
				);
			})}
		</nav>
	);
}
