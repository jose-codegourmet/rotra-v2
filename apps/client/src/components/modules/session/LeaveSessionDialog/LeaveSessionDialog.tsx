"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog/AlertDialog";

export interface LeaveSessionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	busy?: boolean;
}

export function LeaveSessionDialog({
	open,
	onOpenChange,
	onConfirm,
	busy = false,
}: LeaveSessionDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[min(100vw-2rem,480px)]">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-title">
						Leave This Session?
					</AlertDialogTitle>
					<AlertDialogDescription className="text-body text-text-secondary">
						Your slot will be released to the next waitlisted player. Your
						payment must be confirmed by the Que Master before you exit.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button" disabled={busy}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						disabled={busy}
						className="bg-error text-text-primary hover:opacity-90"
						onClick={(e) => {
							e.preventDefault();
							onConfirm();
						}}
					>
						{busy ? "Requesting…" : "REQUEST EXIT"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
