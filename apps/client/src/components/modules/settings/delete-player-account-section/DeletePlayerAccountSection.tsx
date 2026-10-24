"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { deletePlayerAccount } from "@/hooks/usePlayerProfile/server";
import { createClient } from "@/lib/supabase/client";

export type DeletePlayerAccountSectionProps = {
	name: string;
	email: string | null;
};

export function DeletePlayerAccountSection({
	name,
	email,
}: DeletePlayerAccountSectionProps) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [confirmValue, setConfirmValue] = useState("");
	const supabase = createClient();

	const confirmTarget = email?.trim() || name.trim();
	const confirmLabel = email ? "email" : "display name";

	const mutation = useMutation({
		mutationFn: deletePlayerAccount,
		onSuccess: async () => {
			toast.success("Account deleted.");
			setDialogOpen(false);
			await supabase.auth.signOut();
			router.replace("/login");
			router.refresh();
		},
		onError: (error) => {
			const safeMessage =
				error instanceof Error
					? error.message
					: "Unable to delete account right now.";
			toast.error(safeMessage);
		},
	});

	const isPending = mutation.isPending;
	const valueMatches =
		confirmValue.trim().toLowerCase() === confirmTarget.toLowerCase();

	function handleOpenChange(open: boolean) {
		if (isPending) return;
		setDialogOpen(open);
		if (!open) {
			setConfirmValue("");
		}
	}

	return (
		<div className="rounded-lg border border-error/40 bg-bg-surface p-5 shadow-card">
			<h3 className="text-body font-medium text-text-primary">Danger zone</h3>
			<p className="mt-1 text-small text-text-secondary">
				Permanently delete your ROTRA account and sign out. This action cannot
				be undone.
			</p>
			<Button
				type="button"
				variant="destructive"
				className="mt-4"
				onClick={() => setDialogOpen(true)}
			>
				Delete account
			</Button>

			<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Delete your account?</DialogTitle>
						<DialogDescription>
							This permanently removes your profile and signs you out. Type your{" "}
							{confirmLabel} to confirm.
						</DialogDescription>
					</DialogHeader>

					<Field>
						<FieldLabel htmlFor="delete-player-confirm">
							Confirm {confirmLabel}
						</FieldLabel>
						<FieldContent>
							<Input
								id="delete-player-confirm"
								type="text"
								autoComplete="off"
								value={confirmValue}
								onChange={(event) => setConfirmValue(event.target.value)}
								placeholder={confirmTarget}
								disabled={isPending}
							/>
						</FieldContent>
					</Field>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isPending}
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={isPending || !valueMatches}
							onClick={() => {
								if (isPending || !valueMatches) return;
								mutation.mutate();
							}}
						>
							{isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" aria-hidden />
									<span className="sr-only">Deleting account</span>
								</>
							) : (
								"Delete account"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

DeletePlayerAccountSection.displayName = "DeletePlayerAccountSection";
