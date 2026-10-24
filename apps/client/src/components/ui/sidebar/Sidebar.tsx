"use client";

// TODO: Wire LiveSessionStrip / LiveConsoleStrip via useEnrolledSessionState()
// when building LIVE chrome — see PLAN_phase_7_qm_live_chrome.md

import type { AdminRole } from "@prisma/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo/Logo";
import { NotificationsBadge } from "@/components/ui/notifications-badge/NotificationsBadge";
import { Pill } from "@/components/ui/pill/Pill";
import { SidebarUserMenu } from "@/components/ui/sidebar/SidebarUserMenu/SidebarUserMenu";
import { NAV_ITEMS, type NavItemId } from "@/constants/nav";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { cn } from "@/lib/utils";

export type { NavItemId };

type SidebarProps = {
	adminRole?: AdminRole | null;
	isTesterAccount?: boolean;
	currentProfile?: CurrentProfileDisplay | null;
	unreadCount?: number;
};

export function Sidebar({
	adminRole = null,
	isTesterAccount = false,
	currentProfile = null,
	unreadCount = 0,
}: SidebarProps) {
	const pathname = usePathname();
	const activeItem =
		NAV_ITEMS.find(
			(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
		)?.id ?? "home";
	return (
		<aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-20 lg:w-64 bg-bg-base border-r border-border z-50 py-8">
			{/* Logo */}
			<div className="px-5 mb-10">
				<Logo variant="dark" className="w-full" />
			</div>

			{/* Nav items */}
			<nav className="flex-1 space-y-1">
				{NAV_ITEMS.map(({ id, label, Icon, href }) => {
					const isActive = activeItem === id;
					const showNotifBadge = id === "notifications";
					return (
						<Link
							key={id}
							href={href}
							className={cn(
								"w-full flex items-center px-6 py-4 transition-all duration-default",
								isActive
									? "text-accent border-r-2 border-accent bg-gradient-to-r from-accent/10 to-transparent"
									: "text-text-disabled hover:bg-bg-elevated hover:text-text-primary",
							)}
						>
							<span className="relative shrink-0 lg:mr-4">
								<Icon size={20} strokeWidth={1.5} />
								{showNotifBadge ? (
									<span className="pointer-events-none absolute -right-1 -top-1 flex items-center justify-center lg:hidden">
										<NotificationsBadge count={unreadCount} size="sm" />
									</span>
								) : null}
							</span>
							<span className="hidden min-w-0 flex-1 items-center justify-between gap-2 lg:flex">
								<span className="text-label font-medium uppercase tracking-widest">
									{label}
								</span>
								{showNotifBadge ? (
									<NotificationsBadge
										count={unreadCount}
										size="sm"
										className="shrink-0"
									/>
								) : null}
							</span>
						</Link>
					);
				})}
			</nav>

			{/* CTA button */}
			<div className="px-4 mb-6">
				<button
					type="button"
					className="w-full h-12 flex items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-dim text-bg-base font-black transition-transform active:scale-95 shadow-accent"
				>
					<Plus size={20} strokeWidth={2} className="lg:hidden shrink-0" />
					<span className="hidden lg:block text-micro font-black uppercase tracking-widest">
						New Session
					</span>
				</button>
			</div>

			{/* User section */}
			{isTesterAccount && !adminRole ? (
				<div className="px-4 pb-2 hidden lg:block">
					<Pill variant="outline">Tester</Pill>
				</div>
			) : null}
			<SidebarUserMenu adminRole={adminRole} currentProfile={currentProfile} />
		</aside>
	);
}
