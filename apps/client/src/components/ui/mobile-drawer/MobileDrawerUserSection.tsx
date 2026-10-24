import type { AdminRole } from "@prisma/client";
import { LogOutIcon, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button/Button";
import { useLogoutDialog } from "@/hooks/useLogoutDialog/client";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeMobileDrawer } from "@/store/slices/uiSlice";
import { SmallAdminUserCard } from "../small-admin-user-card/SmallAdminUserCard";
import { SmallUserCard } from "../small-user-card/SmallUserCard";

interface MobileDrawerUserSectionProps {
	adminRole?: AdminRole | null;
	currentProfile?: CurrentProfileDisplay | null;
}
export function MobileDrawerUserSection({
	adminRole = null,
	currentProfile = null,
}: MobileDrawerUserSectionProps) {
	const dispatch = useAppDispatch();
	const user = useAppSelector((s) => s.auth.user);
	const initialized = useAppSelector((s) => s.auth.initialized);
	const loading = !initialized;
	const { openDialog: openLogoutDialog } = useLogoutDialog();

	if (!user) return null;

	return (
		<div className="p-6 border-t border-border bg-bg-base">
			<div className="flex items-center gap-3 p-3 bg-bg-surface rounded-lg border border-border/30">
				{adminRole ? (
					<SmallAdminUserCard
						user={user}
						adminRole={adminRole}
						currentProfile={currentProfile}
						isMobile
						onAvatarClick={() => dispatch(closeMobileDrawer())}
					/>
				) : (
					<SmallUserCard
						user={user}
						isOwner={true}
						currentProfile={currentProfile}
						loading={loading}
						isMobile
						onAvatarClick={() => dispatch(closeMobileDrawer())}
					/>
				)}

				<div className="ml-auto flex shrink-0 items-center gap-1">
					<Link
						href="/settings/account"
						aria-label="Account settings"
						onClick={() => dispatch(closeMobileDrawer())}
						className="flex size-9 items-center justify-center rounded-md text-text-disabled hover:bg-bg-elevated hover:text-accent transition-colors duration-default"
					>
						<Settings size={16} strokeWidth={1.5} />
					</Link>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Log out"
						className="text-text-disabled"
						onClick={() => {
							dispatch(closeMobileDrawer());
							openLogoutDialog();
						}}
					>
						<LogOutIcon size={16} strokeWidth={1.5} />
					</Button>
				</div>
			</div>
		</div>
	);
}
