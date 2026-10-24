"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button/Button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
import type { PlayerQueueCardData } from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";

import { PlayerQueueCard } from "../PlayerQueueCard/PlayerQueueCard";
import { PlayerSearchBar } from "../PlayerSearchBar/PlayerSearchBar";

export interface AssignCourtModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	courtTitle: string;
	subtitle?: string;
	players: PlayerQueueCardData[];
	className?: string;
	onConfirm?: () => void;
}

export function AssignCourtModal({
	open,
	onOpenChange,
	courtTitle,
	subtitle = "Pro-league session · Active queue",
	players,
	className,
	onConfirm,
}: AssignCourtModalProps) {
	const [search, setSearch] = useState("");
	const [activeSlot, setActiveSlot] = useState(0);
	const [assignments, setAssignments] = useState<(string | null)[]>([
		null,
		null,
		null,
		null,
	]);

	useEffect(() => {
		if (!open) return;
		setSearch("");
		setActiveSlot(0);
		setAssignments([null, null, null, null]);
	}, [open]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return players;
		return players.filter((p) => p.name.toLowerCase().includes(q));
	}, [players, search]);

	const pickPlayer = useCallback(
		(player: PlayerQueueCardData) => {
			if (player.disabled) return;
			setAssignments((prev) => {
				const next = [...prev];
				next[activeSlot] = player.name;
				const empty = next.indexOf(null);
				if (empty !== -1) {
					queueMicrotask(() => setActiveSlot(empty));
				}
				return next;
			});
		},
		[activeSlot],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn("max-h-[90vh] gap-0 overflow-y-auto p-0", className)}
			>
				<DialogHeader className="flex flex-row items-start justify-between gap-4 border-b border-border p-5">
					<div className="flex flex-col gap-1 text-left">
						<DialogTitle className="text-title font-black uppercase tracking-tight text-accent">
							{courtTitle}
						</DialogTitle>
						<DialogDescription className="text-micro uppercase tracking-widest text-text-disabled">
							{subtitle}
						</DialogDescription>
					</div>
					<DialogClose asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="shrink-0"
							aria-label="Close"
						>
							<X data-icon="inline-start" />
						</Button>
					</DialogClose>
				</DialogHeader>

				<div className="flex flex-col gap-5 p-5">
					<div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
						<div className="flex flex-col gap-2">
							<SlotCell
								label={
									assignments[0] ??
									(activeSlot === 0 ? "Pick a player" : "Empty slot")
								}
								active={activeSlot === 0}
								filled={Boolean(assignments[0])}
								onClick={() => setActiveSlot(0)}
							/>
							<SlotCell
								label={
									assignments[1] ??
									(activeSlot === 1 ? "Pick a player" : "Empty slot")
								}
								active={activeSlot === 1}
								filled={Boolean(assignments[1])}
								onClick={() => setActiveSlot(1)}
							/>
						</div>
						<div className="flex items-center justify-center px-1">
							<span className="text-micro font-black uppercase tracking-widest text-text-disabled">
								VS
							</span>
						</div>
						<div className="flex flex-col gap-2">
							<SlotCell
								label={
									assignments[2] ??
									(activeSlot === 2 ? "Pick a player" : "Empty slot")
								}
								active={activeSlot === 2}
								filled={Boolean(assignments[2])}
								onClick={() => setActiveSlot(2)}
							/>
							<SlotCell
								label={
									assignments[3] ??
									(activeSlot === 3 ? "Pick a player" : "Empty slot")
								}
								active={activeSlot === 3}
								filled={Boolean(assignments[3])}
								onClick={() => setActiveSlot(3)}
							/>
						</div>
					</div>

					<PlayerSearchBar
						value={search}
						onChange={setSearch}
						onFilterClick={() => {}}
					/>

					<div className="grid max-h-[240px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
						{filtered.map((p) => (
							<PlayerQueueCard
								key={p.id}
								player={p}
								onClick={() => pickPlayer(p)}
							/>
						))}
					</div>

					<Button
						type="button"
						className="h-11 w-full bg-gradient-to-br from-accent to-accent-dim font-black uppercase tracking-widest text-bg-base shadow-accent"
						onClick={() => {
							onConfirm?.();
							onOpenChange(false);
						}}
					>
						Confirm assignment
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SlotCell({
	label,
	active,
	filled,
	onClick,
}: {
	label: string;
	active: boolean;
	filled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"min-h-[64px] rounded-lg px-3 py-2 text-left transition-colors duration-default",
				"border",
				active
					? "border-accent bg-accent/10 ring-1 ring-accent"
					: "border-border bg-bg-elevated",
				filled && "text-small font-semibold text-text-primary",
				!filled &&
					"text-micro font-bold uppercase tracking-widest text-text-disabled",
			)}
		>
			{label}
		</button>
	);
}
