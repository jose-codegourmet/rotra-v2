"use client";

import { Copy, QrCode, Share2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { MOCK_CLUB } from "@/constants/mock-club";

export function ClubProfileSidebarMember({ clubId }: { clubId: string }) {
	const searchParams = useSearchParams();
	void clubId;
	void searchParams;

	const enabled = MOCK_CLUB.inviteLinkEnabled;

	return (
		<div className="flex flex-col gap-4 lg:sticky lg:top-24">
			<div className="bg-bg-surface border border-border rounded-lg p-4 shadow-card">
				<p className="text-small font-bold uppercase tracking-widest text-text-secondary mb-3">
					Invite friends
				</p>
				<p className="text-small text-text-secondary mb-4">
					Share your club link or QR. Visibility can be toggled from club
					Settings in{" "}
					<span className="text-text-primary font-medium">/manage</span> later.
				</p>
				{enabled ? (
					<>
						<div className="flex gap-2 mb-3">
							<button
								type="button"
								className="flex-1 h-10 flex items-center justify-center gap-2 rounded-md border border-border text-small font-bold uppercase tracking-widest text-text-primary hover:bg-bg-elevated transition-colors"
							>
								<Share2 size={16} strokeWidth={1.5} />
								Share
							</button>
							<button
								type="button"
								className="flex-1 h-10 flex items-center justify-center gap-2 rounded-md border border-border text-small font-bold uppercase tracking-widest text-text-primary hover:bg-bg-elevated transition-colors"
							>
								<QrCode size={16} strokeWidth={1.5} />
								QR
							</button>
						</div>
						<div className="flex items-center gap-2 rounded-md bg-bg-base border border-border p-2">
							<code className="text-micro text-text-secondary truncate flex-1">
								{MOCK_CLUB.mockInviteUrl}
							</code>
							<button
								type="button"
								className="shrink-0 p-2 text-accent hover:bg-bg-elevated rounded"
								aria-label="Copy invite link"
							>
								<Copy size={16} strokeWidth={1.5} />
							</button>
						</div>
					</>
				) : (
					<p className="text-small text-text-disabled">
						Public invites are disabled for this club.
					</p>
				)}
			</div>

			<div className="bg-bg-surface border border-border rounded-lg p-4 shadow-card">
				<p className="text-small font-bold uppercase tracking-widest text-text-secondary mb-3">
					Quick stats
				</p>
				<div className="text-title font-semibold text-text-primary">
					{MOCK_CLUB.stats.members} members
				</div>
				<p className="text-small text-text-secondary mt-1">
					{MOCK_CLUB.stats.queMasters} Que Masters active
				</p>
			</div>
		</div>
	);
}
