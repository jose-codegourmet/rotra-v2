"use client";

import type { AdminRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { Pill } from "@/components/ui/pill/Pill";
import { displayName as resolvedDisplayName } from "@/lib/auth/supabase-user-display";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { cn } from "@/lib/utils";

export interface SmallAdminUserCardProps {
	user: User;
	adminRole: AdminRole;
	currentProfile?: CurrentProfileDisplay | null;
	isMobile?: boolean;
	onAvatarClick?: () => void;
}

function rolePill(adminRole: AdminRole) {
	if (adminRole === "super_admin") {
		return <Pill variant="superAdmin">Super admin</Pill>;
	}
	return <Pill variant="platformAdmin">Admin</Pill>;
}

export function SmallAdminUserCard({
	user,
	adminRole,
	currentProfile = null,
	isMobile,
	onAvatarClick,
}: SmallAdminUserCardProps) {
	return (
		<div className={cn("w-auto flex items-center justify-start gap-1")}>
			<Link
				href="/profile"
				className="flex min-w-0 items-center gap-3"
				{...(onAvatarClick ? { onClick: onAvatarClick } : {})}
			>
				<div className="relative shrink-0">
					<div className="relative w-10 h-10 rounded-full bg-bg-elevated border-2 border-accent overflow-hidden flex items-center justify-center transition-transform duration-default">
						<UserIcon
							size={18}
							strokeWidth={1.5}
							className="text-text-secondary"
						/>
					</div>
				</div>
			</Link>

			<div
				className={cn(
					"flex-col overflow-hidden flex-1 text-left",
					isMobile ? "flex" : "hidden lg:flex",
				)}
			>
				<span className="text-small font-black text-text-primary uppercase tracking-wider truncate">
					{resolvedDisplayName({ profile: currentProfile, user })}
				</span>
				{rolePill(adminRole)}
			</div>
		</div>
	);
}
