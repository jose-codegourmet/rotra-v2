import { BarChart3, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pill } from "@/components/ui/pill/Pill";
import {
	MOCK_PLAYER_SESSION,
	PLAYER_SESSION_TABS,
	type PlayerSessionChrome,
	type PlayerSessionTabId,
} from "@/constants/mock-player-session";
import { cn } from "@/lib/utils";

const TAB_ICON = {
	courts: LayoutGrid,
	queue: List,
	standings: BarChart3,
} as const;

export type PlayerSessionShellProps = {
	activeTab: PlayerSessionTabId;
	eyebrow: string;
	headline: string;
	subLine: string;
	chrome?: PlayerSessionChrome;
	children: ReactNode;
};

export function PlayerSessionShell({
	activeTab,
	eyebrow,
	headline,
	subLine,
	chrome = MOCK_PLAYER_SESSION,
	children,
}: PlayerSessionShellProps) {
	return (
		<div className="flex min-h-screen bg-bg-base">
			<aside className="hidden w-60 shrink-0 flex-col border-r border-border px-4 py-8 lg:w-64 md:flex">
				<div>
					<p className="text-heading font-bold uppercase tracking-wide text-text-primary">
						ROTRA
					</p>
					<p className="text-small text-text-secondary">Run the game.</p>
				</div>
				<div className="mt-8 rounded-md bg-bg-surface px-3 py-3">
					<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
						{chrome.sessionLabel}
					</p>
					<p className="mt-1 text-small font-semibold text-text-primary">
						{chrome.venue}
					</p>
				</div>
				<nav className="mt-6 flex flex-col gap-1" aria-label="Session views">
					{PLAYER_SESSION_TABS.map((tab) => {
						const Icon = TAB_ICON[tab.id];
						const isActive = tab.id === activeTab;
						return (
							<Link
								key={tab.id}
								href={tab.href}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-small font-semibold",
									isActive
										? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/25"
										: "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
								)}
								aria-current={isActive ? "page" : undefined}
							>
								<Icon className="size-4 shrink-0" aria-hidden />
								{tab.label}
							</Link>
						);
					})}
				</nav>
				<div className="mt-auto flex items-center gap-3 rounded-lg bg-accent/15 px-3 py-3">
					<span
						className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-small font-semibold text-accent"
						aria-hidden
					>
						{chrome.youInitials}
					</span>
					<div className="min-w-0">
						<p className="truncate text-small font-semibold text-text-primary">
							{chrome.youName}
						</p>
						<p className="truncate text-micro text-text-secondary">
							{chrome.youStatus}
						</p>
					</div>
				</div>
			</aside>

			<div className="flex min-h-screen min-w-0 flex-1 flex-col">
				<div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pb-4 md:max-w-none md:px-8 md:pb-8">
					<header className="flex items-end justify-between gap-4 pt-6 md:hidden">
						<div>
							<p className="text-heading font-bold uppercase tracking-wide text-text-primary">
								ROTRA
							</p>
							<p className="text-small text-text-secondary">Run the game.</p>
						</div>
						<Pill variant="accent" className="gap-1.5 font-semibold">
							<span className="size-1.5 rounded-full bg-accent" aria-hidden />
							{chrome.youChip}
						</Pill>
					</header>

					<nav
						className="mt-3 grid grid-cols-3 gap-1 rounded-md border border-border bg-bg-elevated p-1 md:hidden"
						aria-label="Session views"
					>
						{PLAYER_SESSION_TABS.map((tab) => {
							const isActive = tab.id === activeTab;
							return (
								<Link
									key={tab.id}
									href={tab.href}
									className={cn(
										"flex h-8 items-center justify-center rounded-sm text-micro font-medium uppercase tracking-widest",
										isActive
											? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/20"
											: "text-text-secondary",
									)}
									aria-current={isActive ? "page" : undefined}
								>
									{tab.label}
								</Link>
							);
						})}
					</nav>

					<p className="mt-5 flex items-center gap-2 text-micro font-medium uppercase tracking-widest text-text-secondary">
						<span
							className="size-1.5 shrink-0 rounded-full bg-accent shadow-accent"
							aria-hidden
						/>
						{eyebrow}
					</p>
					<h1 className="mt-2 text-display font-bold tracking-tight text-text-primary">
						{headline}
					</h1>
					<p className="mt-2 text-body text-text-secondary">{subLine}</p>

					<div className="mt-6 flex-1">{children}</div>
				</div>
			</div>
		</div>
	);
}

PlayerSessionShell.displayName = "PlayerSessionShell";
