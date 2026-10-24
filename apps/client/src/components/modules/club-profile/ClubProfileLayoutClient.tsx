"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect } from "react";

import {
	mockMembershipToDemoRole,
	resolveDemoRole,
} from "@/constants/club-demo-role";
import { MOCK_CLUB } from "@/constants/mock-club";

import { ClubProfileJoinSticky } from "./ClubProfileJoinSticky";
import { ClubProfileSidebarMember } from "./ClubProfileSidebarMember";
import { ClubProfileSidebarNonMember } from "./ClubProfileSidebarNonMember";
import { ClubProfileTabNav } from "./ClubProfileTabNav";

const PROFILE_SEGMENTS = [
	"overview",
	"schedule",
	"rules",
	"members",
	"announcements",
] as const;

export function ClubProfileLayoutClient({
	clubId,
	children,
}: {
	clubId: string;
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const base = `/clubs/${clubId}`;
	const queryString = searchParams.toString();
	const withQuery = queryString ? `?${queryString}` : "";

	const role = resolveDemoRole(
		searchParams.get("as"),
		mockMembershipToDemoRole(MOCK_CLUB.membershipStatus),
	);

	const isManage = pathname.startsWith(`${base}/manage`);
	const isOwnerOrQM = role === "owner" || role === "que_master";

	useLayoutEffect(() => {
		if (isManage || !isOwnerOrQM) return;
		if (pathname === base) return;
		for (const seg of PROFILE_SEGMENTS) {
			if (pathname === `${base}/${seg}`) {
				router.replace(`${base}${withQuery}`);
				return;
			}
		}
	}, [pathname, base, isManage, isOwnerOrQM, router, withQuery]);

	if (isManage) {
		return <>{children}</>;
	}

	if (isOwnerOrQM && pathname === base) {
		return <>{children}</>;
	}

	if (!isOwnerOrQM) {
		const isOverview = pathname === `${base}/overview`;
		const showSidebar = isOverview;
		const showStickyJoin = role === "not-member";

		return (
			<div className="max-w-[1100px] mx-auto p-4 md:p-8 pb-28 md:pb-8">
				<ClubProfileTabNav clubId={clubId} />
				<div
					className={
						showSidebar
							? "grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8"
							: "grid grid-cols-1 gap-8"
					}
				>
					<div className="min-w-0">{children}</div>
					{showSidebar && role === "not-member" && (
						<ClubProfileSidebarNonMember clubId={clubId} />
					)}
					{showSidebar && role === "member" && (
						<ClubProfileSidebarMember clubId={clubId} />
					)}
				</div>
				{showStickyJoin && <ClubProfileJoinSticky className="lg:hidden" />}
			</div>
		);
	}

	return null;
}
