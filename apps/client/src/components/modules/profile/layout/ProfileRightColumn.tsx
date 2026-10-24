"use client";

import { ProfileRightColumnSkeleton } from "@/components/modules/profile/layout/ProfileRightColumnSkeleton/ProfileRightColumnSkeleton";
import { MatchHistory } from "@/components/modules/profile/MatchHistory/MatchHistory";
import { MetricsCard } from "@/components/modules/profile/MetricsCard/MetricsCard";
import { SkillCalibrationCard } from "@/components/modules/profile/SkillCalibrationCard/SkillCalibrationCard";
import { StatsCards } from "@/components/modules/profile/StatsCards/StatsCards";
import { useProfile } from "@/hooks/useProfile/client";
import { useAppSelector } from "@/store/hooks";
import {
	type ProfileViewUser,
	publicProfileDtoToViewUser,
} from "@/types/profile-view-user";

interface ProfileRightColumnProps {
	userId?: string;
}
export function ProfileRightColumn({ userId }: ProfileRightColumnProps) {
	const { user } = useAppSelector((s) => s.auth);
	const { data: remoteProfile, isPending, isError } = useProfile(userId);

	let player: ProfileViewUser | null = null;
	if (userId) {
		if (remoteProfile) player = publicProfileDtoToViewUser(remoteProfile);
	} else if (user) {
		player = user;
	}

	if (userId && isPending) {
		return (
			<div className="flex-1">
				<ProfileRightColumnSkeleton />
			</div>
		);
	}

	if (!player || (userId && isError)) return null;

	return (
		<div className="flex-1 space-y-8">
			<StatsCards user={player} />
			<SkillCalibrationCard user={player} />
			<MatchHistory user={player} maxMatchPerView={3} />
			<MetricsCard />
		</div>
	);
}
