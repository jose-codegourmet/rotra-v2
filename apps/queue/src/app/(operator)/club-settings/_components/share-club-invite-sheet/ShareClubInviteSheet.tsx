'use client'

import type { Club } from '@rotra/data/club/types'
import { clubInviteUrl } from '@rotra/data/club-player/registration-url'
import { Button } from '@rotra/ui/button'
import { ClubInviteCard } from '@rotra/ui/club-invite-card'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'

export type ShareClubInviteSheetProps = {
  club: Pick<Club, 'id' | 'name' | 'initials' | 'logoUrl' | 'inviteCode'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Q-CLUB / Q-HOME: the Share club invite sheet around ClubInviteCard, opened from settings and Home. */
export function ShareClubInviteSheet({ club, open, onOpenChange }: ShareClubInviteSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share club invite"
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <ClubInviteCard
        link={clubInviteUrl(club.id, club.inviteCode ?? '')}
        slug={club.id}
        clubName={club.name}
        clubInitials={club.initials}
        clubLogoUrl={club.logoUrl}
        onShared={() => toast('Share sheet opened')}
        onDownloaded={() => toast('QR image downloaded')}
        onError={(message) => toast.error(message)}
      />
    </Sheet>
  )
}
