import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClubOwnerQMProfileLanding } from "@/components/modules/club-profile/ClubOwnerQMProfileLanding";
import { clubDemoQueryString } from "@/constants/club-demo-role";
import { resolveServerDemoRole } from "@/lib/club-demo-server";

export const metadata: Metadata = {
	title: "Club — ROTRA",
	description: "Club profile and administration entry.",
};

export default async function ClubRootPage({
	params,
	searchParams,
}: {
	params: Promise<{ clubId: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { clubId } = await params;
	const sp = await searchParams;
	const role = resolveServerDemoRole(
		typeof sp.as === "string" ? sp.as : undefined,
	);

	if (role === "owner" || role === "que_master") {
		return (
			<ClubOwnerQMProfileLanding
				clubId={clubId}
				role={role}
				searchParams={sp}
			/>
		);
	}

	const q = clubDemoQueryString(sp);
	redirect(`/clubs/${clubId}/overview${q}`);
}
