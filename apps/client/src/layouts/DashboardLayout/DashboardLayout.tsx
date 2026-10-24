"use client";

import type { AdminRole } from "@prisma/client";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav/BottomNav";
import { MobileDrawer } from "@/components/ui/mobile-drawer/MobileDrawer";
import { MobileHeader } from "@/components/ui/mobile-header/MobileHeader";
import { Navbar } from "@/components/ui/navbar/Navbar";
import { Sidebar } from "@/components/ui/sidebar/Sidebar";
import { LogoutDialogProvider } from "@/hooks/useLogoutDialog/client";
import { useNotificationsQuery } from "@/hooks/useNotifications/client";
import { adaptNotificationToUiItem } from "@/hooks/useNotifications/server";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { isSessionStandaloneRoute } from "@/lib/sessions/session-standalone-route";

const SHELL_NOTIFICATION_FILTERS = { page: 1, limit: 5 } as const;

interface DashboardLayoutProps {
	children: React.ReactNode;
	pageTitle?: string;
	pageSubtitle?: string;
	adminRole?: AdminRole | null;
	isTesterAccount?: boolean;
	currentProfile?: CurrentProfileDisplay | null;
}

export function DashboardLayout({
	children,
	pageTitle = "Dashboard",
	pageSubtitle = "ROTRA",
	adminRole = null,
	isTesterAccount = false,
	currentProfile = null,
}: DashboardLayoutProps) {
	const pathname = usePathname();
	const isFullBleed = pathname === "/dashboard";
	const hideChrome = isSessionStandaloneRoute(pathname);

	const { data: notificationsData } = useNotificationsQuery(
		SHELL_NOTIFICATION_FILTERS,
		{ refetchInterval: 30_000 },
	);
	const shellNotifications =
		notificationsData?.rows.map((row) => adaptNotificationToUiItem(row)) ?? [];
	const notificationUnreadCount = notificationsData?.unreadCount ?? 0;

	if (hideChrome) {
		return (
			<LogoutDialogProvider>
				<div className="min-h-screen bg-bg-base">{children}</div>
			</LogoutDialogProvider>
		);
	}

	return (
		<LogoutDialogProvider>
			<div className="min-h-screen bg-bg-base">
				{/* Desktop sidebar — icon rail at md, full at lg */}
				<Sidebar
					adminRole={adminRole}
					isTesterAccount={isTesterAccount}
					currentProfile={currentProfile}
					unreadCount={notificationUnreadCount}
				/>

				{/* Desktop top navbar — lg only */}
				<Navbar
					pageTitle={pageTitle}
					pageSubtitle={pageSubtitle}
					notifications={shellNotifications}
					unreadCount={notificationUnreadCount}
					adminRole={adminRole}
					currentProfile={currentProfile}
				/>

				{/* Mobile top header — hidden at md+ */}
				<MobileHeader unreadCount={notificationUnreadCount} />

				{/* Mobile navigation drawer — controlled by Redux */}
				<MobileDrawer
					adminRole={adminRole}
					isTesterAccount={isTesterAccount}
					currentProfile={currentProfile}
				/>

				{/* Main content */}
				<main
					className={
						isFullBleed
							? "md:ml-20 lg:ml-64 pt-16 overflow-hidden"
							: "md:ml-20 lg:ml-64 pt-16 pb-20 md:pb-8 min-h-screen"
					}
				>
					{children}
				</main>

				{/* Mobile bottom navigation — hidden at md+ */}
				<BottomNav unreadCount={notificationUnreadCount} />
			</div>
		</LogoutDialogProvider>
	);
}
