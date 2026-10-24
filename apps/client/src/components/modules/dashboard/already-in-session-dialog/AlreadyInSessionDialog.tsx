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
import type { ActiveSessionSummary } from "@/types/session-discovery";

export interface AlreadyInSessionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	activeSession: ActiveSessionSummary;
	onGoToSession: () => void;
}

export function AlreadyInSessionDialog({
	open,
	onOpenChange,
	activeSession,
	onGoToSession,
}: AlreadyInSessionDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>You&apos;re already in a session</AlertDialogTitle>
					<AlertDialogDescription>
						You&apos;re registered at{" "}
						{activeSession.clubName ?? activeSession.location}. Leave that
						session before joining another.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Stay here</AlertDialogCancel>
					<AlertDialogAction type="button" onClick={onGoToSession}>
						Go to my session
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
