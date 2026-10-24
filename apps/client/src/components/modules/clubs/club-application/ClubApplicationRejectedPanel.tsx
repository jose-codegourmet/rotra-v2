"use client";

import { Button } from "@/components/ui/button/Button";
import { applicationRejectionReasonLabel } from "@/lib/club-application-labels";
import type { ClubApplicationDto } from "@/types/club-application";

export type ClubApplicationRejectedPanelProps = {
	lastRejected: ClubApplicationDto;
	onApplyAgain: () => void;
};

export function ClubApplicationRejectedPanel({
	lastRejected,
	onApplyAgain,
}: ClubApplicationRejectedPanelProps) {
	return (
		<div className="rounded-lg border border-error/40 bg-bg-elevated p-4 space-y-3">
			<p className="text-small font-bold uppercase tracking-widest text-error">
				Application not approved
			</p>
			<p className="text-body text-text-primary">
				<strong className="text-text-primary">{lastRejected.clubName}</strong>
			</p>
			<div className="text-small text-text-secondary space-y-1">
				<p>
					<span className="font-medium text-text-primary">Reason: </span>
					{applicationRejectionReasonLabel(lastRejected.rejectionReason)}
				</p>
				{lastRejected.reviewNote ? (
					<p>
						<span className="font-medium text-text-primary">Note: </span>
						{lastRejected.reviewNote}
					</p>
				) : null}
			</div>
			<Button type="button" variant="default" onClick={onApplyAgain}>
				Start a new application
			</Button>
		</div>
	);
}
