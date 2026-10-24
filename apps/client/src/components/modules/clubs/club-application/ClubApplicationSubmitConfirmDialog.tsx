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

export type ClubApplicationSubmitConfirmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isUpdate: boolean;
	busy: boolean;
	onConfirm: () => void;
};

export function ClubApplicationSubmitConfirmDialog({
	open,
	onOpenChange,
	isUpdate,
	busy,
	onConfirm,
}: ClubApplicationSubmitConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[min(100vw-2rem,480px)]">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-heading">
						{isUpdate
							? "Update your club application?"
							: "Submit your club application?"}
					</AlertDialogTitle>
					<AlertDialogDescription className="text-body text-text-secondary">
						This sends your details to the ROTRA admin team for review. You will
						receive in-app notifications when your application is approved or
						needs more information.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						disabled={busy}
						onClick={(e) => {
							e.preventDefault();
							onConfirm();
						}}
					>
						{busy ? "Sending…" : "Confirm"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
