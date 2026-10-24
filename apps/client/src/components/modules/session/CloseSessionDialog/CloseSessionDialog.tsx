"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";

export interface CloseSessionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sessionTitle: string;
	onConfirm: () => void;
	busy?: boolean;
}

export function CloseSessionDialog({
	open,
	onOpenChange,
	sessionTitle,
	onConfirm,
	busy = false,
}: CloseSessionDialogProps) {
	const [confirmation, setConfirmation] = useState("");
	const matchesTitle = confirmation.trim() === sessionTitle.trim();

	useEffect(() => {
		if (!open) {
			setConfirmation("");
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[min(100vw-2rem,480px)]">
				<DialogHeader>
					<DialogTitle className="text-title">Close This Session?</DialogTitle>
					<DialogDescription className="text-body text-text-secondary">
						Closing ends the session for all players. The queue will stop and no
						new matches can be assigned.
					</DialogDescription>
				</DialogHeader>

				<Field>
					<FieldLabel htmlFor="close-session-confirmation">
						Type the session name to confirm:{" "}
						<span className="font-semibold text-text-primary">
							{sessionTitle}
						</span>
					</FieldLabel>
					<FieldContent>
						<Input
							id="close-session-confirmation"
							value={confirmation}
							onChange={(e) => setConfirmation(e.target.value)}
							placeholder={sessionTitle}
							disabled={busy}
							autoComplete="off"
						/>
					</FieldContent>
				</Field>

				<DialogFooter className="gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={busy}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={busy || !matchesTitle}
						className="bg-error text-text-primary hover:opacity-90"
						onClick={onConfirm}
					>
						{busy ? "Closing…" : "Close session"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
