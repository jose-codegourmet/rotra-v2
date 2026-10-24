"use client";

import * as React from "react";
import { toast } from "sonner";
import { DeleteClubPreviewAlertDialog } from "@/components/modules/club-profile/DeleteClubPreviewAlertDialog";
import { InvitePublicLinksAlertDialog } from "@/components/modules/club-profile/InvitePublicLinksAlertDialog";
import { ProvisionBox } from "@/components/modules/club-profile/ProvisionBox";
import { Button } from "@/components/ui/button/Button";
import { MOCK_CLUB } from "@/constants/mock-club";

export function ManageSettingsClient() {
	const [inviteEnabled, setInviteEnabled] = React.useState<boolean>(
		MOCK_CLUB.inviteLinkEnabled,
	);
	const [inviteDialog, setInviteDialog] = React.useState<"off" | "on" | null>(
		null,
	);
	const [deletePreviewOpen, setDeletePreviewOpen] = React.useState(false);

	const confirmInviteToggle = () => {
		if (inviteDialog === "off") {
			setInviteEnabled(false);
			toast.success("Public invites disabled (demo — sidebar not wired).");
		} else if (inviteDialog === "on") {
			setInviteEnabled(true);
			toast.success("Public invites enabled (demo).");
		}
		setInviteDialog(null);
	};

	return (
		<div className="flex flex-col gap-6">
			<h2 className="text-title font-bold text-text-primary">Settings</h2>
			<div className="grid gap-4 md:grid-cols-2">
				<ProvisionBox title="Public invite link & QR">
					<p className="text-small text-text-secondary mb-4">
						Toggle whether members can share invite links (see overview
						sidebar). Demo state:{" "}
						<span className="font-medium text-text-primary">
							{inviteEnabled ? "enabled" : "disabled"}
						</span>
						.
					</p>
					<div className="flex flex-wrap gap-2">
						{inviteEnabled ? (
							<Button
								type="button"
								variant="outline"
								className="text-error border-error/40 hover:bg-error/10"
								onClick={() => setInviteDialog("off")}
							>
								Disable public invites…
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={() => setInviteDialog("on")}
							>
								Enable public invites…
							</Button>
						)}
					</div>
				</ProvisionBox>

				<ProvisionBox title="Auto-approve & visibility">
					Club discovery and join automation (UI placeholders).
				</ProvisionBox>

				<ProvisionBox title="Delete club (owner only)">
					<p className="text-small text-text-secondary mb-4">
						Interim: requests go to jose@codegourmet.io until admin portal
						exists. QM cannot delete the club.
					</p>
					<Button
						type="button"
						variant="destructive"
						onClick={() => setDeletePreviewOpen(true)}
					>
						Preview deletion confirmation (demo)
					</Button>
				</ProvisionBox>

				<ProvisionBox title="Hero image & description">
					Public profile content management.
				</ProvisionBox>
			</div>

			<InvitePublicLinksAlertDialog
				intent={inviteDialog}
				onOpenChange={(open) => {
					if (!open) setInviteDialog(null);
				}}
				onConfirm={confirmInviteToggle}
			/>

			<DeleteClubPreviewAlertDialog
				open={deletePreviewOpen}
				onOpenChange={setDeletePreviewOpen}
				onAcknowledge={() => {
					toast.message("Demo only — no deletion performed.");
				}}
			/>
		</div>
	);
}
