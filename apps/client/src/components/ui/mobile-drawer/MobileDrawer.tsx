"use client";

import type { AdminRole } from "@prisma/client";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo/Logo";
import { MobileDrawerUserSection } from "@/components/ui/mobile-drawer/MobileDrawerUserSection";
import { Pill } from "@/components/ui/pill/Pill";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { NAV_ITEMS } from "@/constants/nav";
import type { CurrentProfileDisplay } from "@/lib/server/current-profile";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeMobileDrawer } from "@/store/slices/uiSlice";

type MobileDrawerProps = {
	adminRole?: AdminRole | null;
	isTesterAccount?: boolean;
	currentProfile?: CurrentProfileDisplay | null;
};

export function MobileDrawer({
	adminRole = null,
	isTesterAccount = false,
	currentProfile = null,
}: MobileDrawerProps) {
	const pathname = usePathname();
	const activeItem =
		NAV_ITEMS.find(
			(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
		)?.id ?? "home";
	const dispatch = useAppDispatch();
	const isOpen = useAppSelector((state) => state.ui.isMobileDrawerOpen);

	return (
		<>
			{/* Backdrop overlay */}
			<div
				className={cn(
					"fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-opacity duration-slow",
					isOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none",
				)}
				onClick={() => dispatch(closeMobileDrawer())}
				aria-hidden="true"
			/>

			{/* Drawer panel */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-[60] w-72 bg-bg-base flex flex-col md:hidden",
					"border-r border-border shadow-modal",
					"transform transition-transform duration-slow ease-in-out",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
				aria-label="Navigation menu"
			>
				{/* Header */}
				<div className="p-6 flex justify-between items-center border-b border-border">
					<div className="flex items-center gap-2 w-full">
						<Logo variant="dark" className="w-full" />
					</div>
					<button
						type="button"
						aria-label="Close navigation menu"
						className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-full transition-colors duration-default"
						onClick={() => dispatch(closeMobileDrawer())}
					>
						<X size={20} strokeWidth={1.5} />
					</button>
				</div>

				{/* Nav items */}
				<nav className="flex-1 py-4">
					{NAV_ITEMS.map(({ id, label, Icon, href }) => {
						const isActive = activeItem === id;
						return (
							<Link
								key={id}
								href={href}
								onClick={() => dispatch(closeMobileDrawer())}
								className={cn(
									"w-full flex items-center px-6 py-4 transition-colors duration-default",
									isActive
										? "text-accent bg-accent/10 border-r-4 border-accent"
										: "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
								)}
							>
								<Icon
									size={20}
									strokeWidth={isActive ? 2 : 1.5}
									className="mr-4 shrink-0"
								/>
								<span
									className={cn(
										"text-label uppercase tracking-widest",
										isActive ? "font-bold" : "font-medium",
									)}
								>
									{label}
								</span>
							</Link>
						);
					})}

					{/* Theme toggle */}
					<ThemeToggle variant="row" />
				</nav>

				{isTesterAccount && !adminRole ? (
					<div className="px-6 pb-2">
						<Pill variant="outline">Tester</Pill>
					</div>
				) : null}
				<MobileDrawerUserSection
					adminRole={adminRole}
					currentProfile={currentProfile}
				/>
			</aside>
		</>
	);
}
