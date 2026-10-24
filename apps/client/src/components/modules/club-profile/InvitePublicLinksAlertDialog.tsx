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

export function InvitePublicLinksAlertDialog({
	intent,
	onOpenChange,
	onConfirm,
}: {
	intent: "off" | "on" | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	const open = intent !== null;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{intent === "off"
							? "Disable public invite links?"
							: intent === "on"
								? "Enable public invite links?"
								: ""}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{intent === "off"
							? "Members will no longer see share and QR controls in the profile sidebar once this is wired to real data."
							: intent === "on"
								? "Members will be able to share the club invite again when backend support exists."
								: null}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Cancel</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						onClick={onConfirm}
						className={
							intent === "off"
								? "bg-error text-text-primary hover:opacity-90"
								: undefined
						}
					>
						Confirm
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
