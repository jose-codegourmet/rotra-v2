import { Download, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button/Button";
import type { FinancialLineItem, LedgerRow } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

export interface SessionLedgerRowProps {
	row: LedgerRow;
	className?: string;
}

const paymentStyles = {
	paid: "bg-accent text-bg-base",
	pending: "bg-bg-elevated text-text-primary border border-border",
	partial: "bg-warning/20 text-warning",
} as const;

export function SessionLedgerRow({ row, className }: SessionLedgerRowProps) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-3 sm:gap-4 py-4 border-b border-border last:border-0",
				className,
			)}
		>
			<div className="size-11 rounded-full bg-bg-elevated border border-border shrink-0" />
			<div className="min-w-[140px] flex-1">
				<p className="text-small font-bold text-text-primary">{row.name}</p>
				{row.subtitle ? (
					<p className="text-micro text-text-disabled mt-0.5">{row.subtitle}</p>
				) : null}
			</div>
			<span className="text-small text-text-secondary w-16 tabular-nums">
				{String(row.games).padStart(2, "0")} games
			</span>
			<span className="text-small text-text-secondary min-w-[140px]">
				{row.timeRange}
			</span>
			<span
				className={cn(
					"ml-auto text-micro font-black uppercase tracking-widest px-3 py-1 rounded-full",
					paymentStyles[row.payment],
				)}
			>
				{row.payment === "paid"
					? "Paid"
					: row.payment === "pending"
						? "Pending"
						: "Partial"}
			</span>
		</div>
	);
}

export interface SessionFinancialsViewProps {
	title?: string;
	subtitle?: string;
	ledger: LedgerRow[];
	lineItems: FinancialLineItem[];
	totalCost: string;
	profit: string;
	className?: string;
}

export function SessionFinancialsView({
	title = "Player ledgers",
	subtitle = "24 active participants",
	ledger,
	lineItems,
	totalCost,
	profit,
	className,
}: SessionFinancialsViewProps) {
	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h2 className="text-display font-bold text-text-primary tracking-tight">
						{title}
					</h2>
					<p className="text-micro text-text-disabled uppercase tracking-widest mt-1">
						{subtitle}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Filter"
					>
						<SlidersHorizontal className="size-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Export"
					>
						<Download className="size-4" />
					</Button>
				</div>
			</div>

			<div className="flex flex-col xl:flex-row gap-6">
				<div className="flex-1 rounded-lg bg-bg-surface border border-border px-4 min-w-0">
					{ledger.map((row) => (
						<SessionLedgerRow key={row.id} row={row} />
					))}
				</div>

				<div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-4">
					<div className="rounded-lg bg-bg-surface border border-border p-5 flex flex-col gap-4">
						<p className="text-label font-black uppercase tracking-widest text-text-primary">
							Financial summary
						</p>
						<ul className="flex flex-col gap-2">
							{lineItems.map((line) => (
								<li
									key={line.label}
									className="flex justify-between text-small text-text-secondary"
								>
									<span>{line.label}</span>
									<span className="font-semibold text-text-primary tabular-nums">
										{line.value}
									</span>
								</li>
							))}
						</ul>
						<div className="pt-2 border-t border-border flex justify-between items-baseline">
							<span className="text-label font-bold uppercase tracking-widest text-text-disabled">
								Total cost
							</span>
							<span className="text-heading font-black text-text-primary tabular-nums">
								{totalCost}
							</span>
						</div>
						<div className="rounded-lg bg-accent/10 border border-accent/25 px-4 py-3 flex justify-between items-center">
							<span className="text-micro font-bold uppercase tracking-widest text-text-secondary">
								Profit
							</span>
							<span className="text-heading font-black text-accent tabular-nums">
								{profit}
							</span>
						</div>
						<Button
							type="button"
							className="w-full h-11 uppercase font-black tracking-widest text-bg-base bg-gradient-to-br from-accent to-accent-dim shadow-accent"
						>
							Generate invoice
						</Button>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded-lg bg-bg-surface border border-border p-3">
							<p className="text-micro text-text-disabled uppercase font-bold tracking-wider">
								Avg / player
							</p>
							<p className="text-heading font-bold text-text-primary mt-1 tabular-nums">
								$26.50
							</p>
						</div>
						<div className="rounded-lg bg-bg-surface border border-border p-3">
							<p className="text-micro text-text-disabled uppercase font-bold tracking-wider">
								Unpaid
							</p>
							<p className="text-heading font-bold text-error mt-1 tabular-nums">
								$112.00
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
