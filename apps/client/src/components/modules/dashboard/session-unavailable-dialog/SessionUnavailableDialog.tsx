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

interface SessionUnavailableDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRefresh: () => void;
}

export function SessionUnavailableDialog({
	open,
	onOpenChange,
	onRefresh,
}: SessionUnavailableDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						This session is no longer available
					</AlertDialogTitle>
					<AlertDialogDescription>
						It may have ended, been cancelled, or filled up. Here are other
						sessions near you.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Close</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						onClick={() => {
							onRefresh();
							onOpenChange(false);
						}}
					>
						Refresh nearby
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
