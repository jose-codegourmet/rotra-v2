"use client";

import type { AdminRole } from "@prisma/client";
import { LogOut, Search, Settings, UserCircle, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { NotificationsDropdown } from "@/components/modules/notifications/notifications-dropdown/NotificationsDropdown";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import type { Notification } from "@/constants/mock-notifications";
import { useLogoutDialog } from "@/hooks/useLogoutDialog/client";
import { avatarUrl, displayName } from "@/lib/auth/supabase-user-display";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

export interface NavbarProps {
	pageTitle?: string;
	pageSubtitle?: string;
	notifications: Notification[];
	unreadCount: number;
	adminRole?: AdminRole | null;
	currentProfile?: CurrentProfileDisplay | null;
}

export function Navbar({
	pageTitle = "Dashboard",
	pageSubtitle = "ROTRA",
	notifications,
	unreadCount,
	adminRole = null,
	currentProfile = null,
}: NavbarProps) {
	const { openDialog: openLogoutDialog } = useLogoutDialog();
	const user = useAppSelector((s) => s.auth.user);
	const initialized = useAppSelector((s) => s.auth.initialized);

	const profileHref = adminRole
		? "/profile"
		: user
			? `/profile/${user.id}`
			: "/profile";

	const avatarSrc = user ? avatarUrl({ profile: currentProfile, user }) : null;
	const userDisplayName = displayName({
		profile: currentProfile,
		user,
		loading: !initialized,
	});

	return (
		<header className="hidden lg:flex fixed top-0 right-0 w-[calc(100%-256px)] h-16 items-center justify-between px-8 z-40 border-b border-border backdrop-blur-xl bg-bg-surface/80">
			{/* Left: breadcrumb */}
			<div className="flex items-center gap-4">
				<span className="text-label font-bold uppercase tracking-widest text-accent">
					{pageTitle}
				</span>
				<div className="h-4 w-px bg-border-strong" />
				<span className="text-label font-bold uppercase tracking-widest text-text-secondary">
					{pageSubtitle}
				</span>
			</div>

			{/* Right: actions */}
			<div className="flex items-center gap-6">
				<ThemeToggle />
				<NotificationsDropdown
					notifications={notifications}
					unreadCount={unreadCount}
				/>
				<button
					type="button"
					className="text-text-disabled hover:text-accent transition-colors duration-default"
					aria-label="Search"
				>
					<Search size={20} strokeWidth={1.5} />
				</button>

				{user ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className={cn(
									"relative flex size-9 shrink-0 items-center justify-center rounded-full",
									"border-2 border-accent bg-bg-elevated overflow-hidden",
									"text-text-disabled hover:ring-2 hover:ring-accent/30 transition-shadow duration-default",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
								)}
								aria-label="Open account menu"
							>
								{avatarSrc ? (
									<Image
										src={avatarSrc}
										alt=""
										fill
										className="object-cover"
										sizes="36px"
										unoptimized
									/>
								) : (
									<UserIcon size={18} strokeWidth={1.5} />
								)}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-[12rem]">
							<div className="px-2 py-2">
								<p className="text-small font-semibold text-text-primary truncate">
									{userDisplayName}
								</p>
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link
									href={profileHref}
									className="flex items-center gap-2 cursor-pointer"
								>
									<UserCircle size={16} strokeWidth={1.5} />
									View profile
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									href="/settings/account"
									className="flex items-center gap-2 cursor-pointer"
								>
									<Settings size={16} strokeWidth={1.5} />
									Account settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-error focus:text-error cursor-pointer"
								onSelect={() => {
									openLogoutDialog();
								}}
							>
								<LogOut size={16} strokeWidth={1.5} />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
		</header>
	);
}
