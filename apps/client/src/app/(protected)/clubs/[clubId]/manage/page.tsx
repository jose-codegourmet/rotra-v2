import { redirect } from "next/navigation";

import { clubDemoQueryString } from "@/constants/club-demo-role";

export default async function ClubManageIndexPage({
	params,
	searchParams,
}: {
	params: Promise<{ clubId: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { clubId } = await params;
	const sp = await searchParams;
	const q = clubDemoQueryString(sp);
	redirect(`/clubs/${clubId}/manage/members${q}`);
}
