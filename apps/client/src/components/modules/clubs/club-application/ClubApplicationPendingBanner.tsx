"use client";

import { useState } from "react";
import { ClubApplicationForm } from "@/components/modules/clubs/club-application-form/ClubApplicationForm";
import type { ClubApplicationCreateFormValues } from "@/components/modules/clubs/club-application-form/schema";
import { Button } from "@/components/ui/button/Button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
import type { ClubApplicationDto } from "@/types/club-application";

const SLA_HOURS = 24;

function formatSlaDeadline(updatedAtIso: string): string {
	const d = new Date(updatedAtIso);
	d.setHours(d.getHours() + SLA_HOURS);
	return d.toLocaleString();
}

export type ClubApplicationPendingBannerProps = {
	pending: ClubApplicationDto;
	syncFromPending: ClubApplicationCreateFormValues | null;
	rejectedDismissed: boolean;
	isBusy: boolean;
};

export function ClubApplicationPendingBanner({
	pending,
	rejectedDismissed,
	isBusy,
	syncFromPending,
}: ClubApplicationPendingBannerProps) {
	const [showPendingDetails, setShowPendingDetails] = useState(false);
	const handleShowPendingDetails = () => {
		setShowPendingDetails(true);
	};
	return (
		<div
			className="rounded-lg border border-warning/50 bg-bg-elevated p-4 text-body text-text-secondary"
			role="status"
		>
			<p className="text-small font-bold uppercase tracking-widest text-warning mb-2">
				Under review
			</p>
			<p className="text-body text-text-primary">
				Your club application is with the ROTRA team. You can still edit your
				details below; saving updates your application and{" "}
				<strong className="text-text-primary">
					restarts the {SLA_HOURS}-hour
				</strong>{" "}
				review window.
			</p>
			<p className="text-small text-text-secondary mt-3">
				If it is not reviewed within {SLA_HOURS} hours from your last save, it
				will close automatically and you can submit again. You will get in-app
				notifications when there is a decision.
			</p>
			<p className="text-micro text-text-disabled mt-2 mb-4">
				Last updated {new Date(pending.updatedAt).toLocaleString()} · Review
				deadline from last save: {formatSlaDeadline(pending.updatedAt)}
			</p>
			<Button onClick={handleShowPendingDetails}>Show pending details</Button>
			<Dialog open={showPendingDetails} onOpenChange={setShowPendingDetails}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pending details</DialogTitle>
					</DialogHeader>
					<div className="h-screen max-h-[60vh] overflow-y-auto">
						<p>These are the pending details.</p>
						<ClubApplicationForm
							key={`${pending?.id ?? "new"}-${rejectedDismissed ? "d" : "r"}`}
							syncFromPending={syncFromPending}
							disabled={isBusy}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
