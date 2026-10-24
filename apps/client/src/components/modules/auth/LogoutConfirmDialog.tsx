"use client";

import { Button } from "@/components/ui/button/Button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";

export type LogoutConfirmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	isPending?: boolean;
};

export function LogoutConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	isPending = false,
}: LogoutConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton={!isPending}>
				<DialogHeader>
					<DialogTitle className="text-display font-bold tracking-tight">
						Log out?
					</DialogTitle>
					<DialogDescription>
						You will need to sign in again to access your ROTRA account and
						dashboard.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isPending}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						type="button"
						variant="destructive"
						disabled={isPending}
						onClick={() => {
							void onConfirm();
						}}
					>
						{isPending ? "Signing out…" : "Log out"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
