import type { Metadata } from "next";

import { ManageMembersClient } from "@/components/modules/club-profile/ManageMembersClient";

export const metadata: Metadata = {
	title: "Manage members — ROTRA",
	description: "Club member administration.",
};

export default async function ManageMembersPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return <ManageMembersClient />;
}
