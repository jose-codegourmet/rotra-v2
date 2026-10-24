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

export function DeleteClubPreviewAlertDialog({
	open,
	onOpenChange,
	onAcknowledge,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAcknowledge: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete this club?</AlertDialogTitle>
					<AlertDialogDescription>
						This is a mock confirmation only. No club is deleted. Owners must
						email{" "}
						<span className="text-text-primary font-medium">
							jose@codegourmet.io
						</span>{" "}
						until the admin portal is available. Que Masters cannot perform this
						action.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Cancel</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						className="bg-error text-text-primary hover:opacity-90"
						onClick={() => {
							onAcknowledge();
							onOpenChange(false);
						}}
					>
						I understand
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
