"use client";

import * as React from "react";

import { Button } from "@/components/ui/button/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
import { Input } from "@/components/ui/input/Input";
import type { ManageMemberRow } from "@/constants/mock-club";

export function AddQueMasterDialog({
	open,
	onOpenChange,
	players,
	onPickPlayer,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	players: ManageMemberRow[];
	onPickPlayer: (player: ManageMemberRow) => void;
}) {
	const [query, setQuery] = React.useState("");

	React.useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	const filteredPlayers = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return players;
		return players.filter(
			(p) =>
				p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
		);
	}, [players, query]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Que Master</DialogTitle>
					<DialogDescription>
						Choose a player from the mock roster to promote. Demo only — no API
						call.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input
						placeholder="Search by name or email…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						aria-label="Filter players"
					/>
					<ul className="max-h-56 overflow-y-auto flex flex-col gap-1 rounded-md border border-border bg-bg-base p-1">
						{filteredPlayers.length === 0 ? (
							<li className="px-3 py-6 text-center text-small text-text-secondary">
								{players.length === 0
									? "No players left to promote in this demo roster."
									: "No matches for your search."}
							</li>
						) : (
							filteredPlayers.map((p) => (
								<li key={p.id}>
									<button
										type="button"
										className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-small transition-colors hover:bg-bg-elevated"
										onClick={() => onPickPlayer(p)}
									>
										<span className="font-semibold text-text-primary">
											{p.name}
										</span>
										<span className="text-micro text-text-secondary">
											{p.email}
										</span>
									</button>
								</li>
							))
						)}
					</ul>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
