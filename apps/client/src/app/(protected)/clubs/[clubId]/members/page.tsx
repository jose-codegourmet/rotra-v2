import type { Metadata } from "next";

import { ClubProfileMembersPreview } from "@/components/modules/club-profile/ClubProfileMembersPreview";
import { ClubProfileMembersTable } from "@/components/modules/club-profile/ClubProfileMembersTable";
import {
	getPublicMemberPreview,
	MOCK_CLUB_MEMBER_ROWS,
} from "@/constants/mock-club";
import { resolveServerDemoRole } from "@/lib/club-demo-server";

export const metadata: Metadata = {
	title: "Club members — ROTRA",
	description: "Club member roster.",
};

export default async function ClubMembersPage({
	params,
	searchParams,
}: {
	params: Promise<{ clubId: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	await params;
	const sp = await searchParams;
	const role = resolveServerDemoRole(
		typeof sp.as === "string" ? sp.as : undefined,
	);
	const isFullMember = role === "member";
	const previewRows = getPublicMemberPreview(MOCK_CLUB_MEMBER_ROWS);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-title font-bold text-text-primary tracking-tight mb-2">
					Members
				</h1>
				<p className="text-small text-text-secondary uppercase tracking-widest">
					{isFullMember
						? "Full roster (member view)"
						: "Public preview — join to see everyone"}
				</p>
			</div>

			{isFullMember ? (
				<ClubProfileMembersTable data={MOCK_CLUB_MEMBER_ROWS} />
			) : (
				<ClubProfileMembersPreview rows={previewRows} />
			)}
		</div>
	);
}
