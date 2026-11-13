'use client'
import type { ClubPageMember } from '@rotra/data/club-page/types'
import { ProfileCard } from '@/app/_components/profile-card/ProfileCard'

/**
 * The profile dialog a club member opens (P-CLUB-PAGE grid, P-CLUB-MEMBERS rows). Signed-in only;
 * a masked member gets the private card with their own banner and nothing is requested for them.
 */
export function MemberProfile({
  member,
  onClose,
}: {
  member: ClubPageMember | null
  onClose: () => void
}) {
  return (
    <ProfileCard
      person={
        member
          ? {
              playerId: member.playerId,
              name: member.name,
              nickname: member.nickname,
              picture: member.picture,
              level: member.level,
              isYou: member.isYou,
              masked: member.masked || !member.playerId,
              bannerKey: member.bannerKey,
              bannerImageUrl: member.bannerImageUrl,
            }
          : null
      }
      onClose={onClose}
    />
  )
}
