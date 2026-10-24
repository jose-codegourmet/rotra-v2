"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ClubApplicationApplySkeleton } from "@/components/modules/clubs/club-application/ClubApplicationApplySkeleton";
import { ClubApplicationPendingBanner } from "@/components/modules/clubs/club-application/ClubApplicationPendingBanner";
import { ClubApplicationRejectedPanel } from "@/components/modules/clubs/club-application/ClubApplicationRejectedPanel";
import { ClubApplicationForm } from "@/components/modules/clubs/club-application-form/ClubApplicationForm";
import type { ClubApplicationCreateFormValues } from "@/components/modules/clubs/club-application-form/schema";
import { Button } from "@/components/ui/button/Button";
import {
	useCancelClubApplicationMutation,
	useMyClubApplication,
	useSaveClubApplicationMutation,
} from "@/hooks/useClubApplication/client";

export default function ClubApplyPage() {
	const { data, isLoading, error, refetch } = useMyClubApplication();
	const saveMut = useSaveClubApplicationMutation();
	const cancelMut = useCancelClubApplicationMutation();

	const isPending = data?.pending ?? null;
	const lastRejected = data?.lastRejected ?? null;

	const [rejectedDismissed, setRejectedDismissed] = useState(false);

	const isBusy = saveMut.isPending || cancelMut.isPending;

	const syncValues = isPending
		? ({
				clubName: isPending.clubName,
				description: isPending.description,
				intent: isPending.intent,
				locationCity: isPending.locationCity,
				locationVenue: isPending.locationVenue,
				venueAddress: isPending.venueAddress,
				facebookPageUrl: isPending.facebookPageUrl ?? "",
				facebookProfileUrl: isPending.facebookProfileUrl ?? "",
				contactNumber: isPending.contactNumber ?? "",
				expectedPlayerCount: isPending.expectedPlayerCount,
				additionalNotes: isPending.additionalNotes ?? "",
			} satisfies ClubApplicationCreateFormValues)
		: null;

	const showRejected = !isPending && lastRejected != null && !rejectedDismissed;

	return (
		<div className="mx-auto w-full max-w-[600px] md:max-w-[640px] p-4 md:p-8 space-y-6">
			<div>
				<p className="text-micro font-bold uppercase tracking-widest text-accent mb-1">
					Clubs
				</p>
				<h1 className="text-display font-bold text-text-primary tracking-tight">
					Apply for a new club
				</h1>
				<p className="text-body text-text-secondary mt-2">
					Tell us about your club. An admin will review your application and you
					will be notified in the app.
				</p>
			</div>

			<div className="rounded-lg border border-border bg-bg-surface p-4 text-small text-text-secondary space-y-2">
				<p className="font-semibold text-text-primary">What happens next</p>
				<ul className="list-disc pl-5 space-y-1">
					<li>We route your application to the ROTRA admin team.</li>
					<li>
						You receive in-app notifications when it is approved or rejected.
					</li>
					<li>
						There is a 24-hour review window from your last save: if nobody
						decides in time, the application closes automatically and you can
						submit again right away.
					</li>
				</ul>
			</div>

			<Button variant="link" className="h-auto p-0" asChild>
				<Link href="/clubs">← Back to clubs</Link>
			</Button>

			{isLoading ? <ClubApplicationApplySkeleton /> : null}
			{error ? (
				<p className="text-body text-error" role="alert">
					{String(error.message)}
				</p>
			) : null}

			{!isLoading && !error ? (
				<>
					{isPending ? (
						<ClubApplicationPendingBanner
							pending={isPending}
							rejectedDismissed={rejectedDismissed}
							syncFromPending={syncValues}
							isBusy={isBusy}
						/>
					) : null}

					{showRejected ? (
						<ClubApplicationRejectedPanel
							lastRejected={lastRejected}
							onApplyAgain={() => {
								setRejectedDismissed(true);
							}}
						/>
					) : null}

					{!isPending ? (
						<ClubApplicationForm
							key={`new-${rejectedDismissed ? "d" : "r"}`}
							syncFromPending={syncValues}
							disabled={isBusy}
						/>
					) : null}

					{isPending ? (
						<div className="pt-2 border-t border-border">
							<Button
								type="button"
								variant="outline"
								disabled={isBusy}
								onClick={() => {
									cancelMut.mutate(isPending.id, {
										onSuccess: () => {
											toast.success("Application cancelled.");
											void refetch();
										},
										onError: (e) => {
											toast.error(String(e.message));
										},
									});
								}}
							>
								Cancel application
							</Button>
						</div>
					) : null}

					{(saveMut.error || cancelMut.error) && (
						<p className="text-small text-error" role="alert">
							{String(saveMut.error?.message ?? cancelMut.error?.message)}
						</p>
					)}
				</>
			) : null}
		</div>
	);
}
