"use client";

import type { AdminRole } from "@prisma/client";
import { LogOut, MoreVertical, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLogoutDialog } from "@/hooks/useLogoutDialog/client";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { SmallAdminUserCard } from "../../small-admin-user-card/SmallAdminUserCard";
import { SmallUserCard } from "../../small-user-card/SmallUserCard";

type SidebarUserMenuProps = {
	adminRole?: AdminRole | null;
	currentProfile?: CurrentProfileDisplay | null;
};

export function SidebarUserMenu({
	adminRole = null,
	currentProfile = null,
}: SidebarUserMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const user = useAppSelector((s) => s.auth.user);
	const containerRef = useRef<HTMLDivElement>(null);
	const { openDialog: openLogoutDialog } = useLogoutDialog();

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const profileHref = adminRole
		? "/profile"
		: user
			? `/profile/${user.id}`
			: "/profile";

	return (
		<div
			className="mt-auto pt-6 border-t border-border px-4"
			ref={containerRef}
		>
			<div className="relative">
				{/* Popup menu */}
				{isOpen && (
					<div className="absolute bottom-full left-0 mb-2 w-full bg-bg-surface border border-border rounded-lg shadow-modal overflow-hidden z-10">
						<Link
							href={profileHref}
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 px-4 min-h-[44px] text-small font-bold text-text-primary hover:bg-bg-elevated transition-colors duration-default uppercase tracking-widest"
						>
							<UserCircle
								size={16}
								strokeWidth={1.5}
								className="shrink-0 text-text-secondary"
							/>
							Profile
						</Link>
						<Link
							href="/settings/account"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 px-4 min-h-[44px] text-small font-bold text-text-primary hover:bg-bg-elevated transition-colors duration-default uppercase tracking-widest"
						>
							<Settings
								size={16}
								strokeWidth={1.5}
								className="shrink-0 text-text-secondary"
							/>
							Account Settings
						</Link>
						<div className="h-px bg-border" />
						<button
							type="button"
							className="w-full flex items-center gap-3 px-4 min-h-[44px] text-small font-bold text-error hover:bg-bg-elevated transition-colors duration-default uppercase tracking-widest"
							onClick={() => {
								setIsOpen(false);
								openLogoutDialog();
							}}
						>
							<LogOut size={16} strokeWidth={1.5} className="shrink-0" />
							Log Out
						</button>
					</div>
				)}

				{/* User row trigger */}
				{user && (
					<button
						type="button"
						aria-label="Open user menu"
						aria-expanded={isOpen}
						onClick={() => setIsOpen((prev) => !prev)}
						className="w-full flex items-center gap-3 lg:bg-bg-surface lg:p-3 rounded-lg transition-colors duration-default hover:bg-bg-elevated cursor-pointer group min-h-[44px]"
					>
						{adminRole ? (
							<SmallAdminUserCard
								user={user}
								adminRole={adminRole}
								currentProfile={currentProfile}
							/>
						) : (
							<SmallUserCard
								user={user}
								isOwner={true}
								currentProfile={currentProfile}
							/>
						)}

						<MoreVertical
							size={16}
							strokeWidth={1.5}
							className={cn(
								"hidden lg:block ml-auto text-text-disabled transition-transform duration-default",
								isOpen && "rotate-90",
							)}
						/>
					</button>
				)}
			</div>
		</div>
	);
}
