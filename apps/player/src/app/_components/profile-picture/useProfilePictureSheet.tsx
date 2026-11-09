'use client'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useProfileCharacters } from '@rotra/data/profile-character/useProfileCharacters'
import { preparePlayerPhoto } from '@rotra/data/player/photo'
import { type PlayerPictureChoice, parsePlayerPicture } from '@rotra/data/player/picture'
import type { PlayerProfile } from '@rotra/data/player/types'
import { useSetMyProfilePicture } from '@rotra/data/player/useSetMyProfilePicture'
import { ProfilePictureSheet } from '@rotra/ui/profile-picture-sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

/** Both entry points share one local draft and persist only through Done. */
export function useProfilePictureSheet(profile: PlayerProfile | null | undefined) {
  const [open, setOpen] = useState(false)
  const mutation = useSetMyProfilePicture()
  const account = useMyAccount(profile?.playerId ?? null)
  const characters = useProfileCharacters()
  const commit = async (choice: PlayerPictureChoice) => {
    await mutation.mutateAsync(choice)
    toast(choice.kind === 'initials' ? 'Using your initials' : 'Profile picture updated')
  }
  const sheet = profile ? (
    <ProfilePictureSheet
      open={open}
      onOpenChange={setOpen}
      playerId={profile.playerId}
      name={profile.fullName}
      picture={parsePlayerPicture(profile.picture)}
      previousPhoto={account.data?.avatarPreviousRef}
      characters={characters.data ?? []}
      onCommitDraft={async choice => { await commit(choice) }}
      isPending={mutation.isPending}
      preparePhoto={preparePlayerPhoto}
      onCommit={commit}
    />
  ) : null
  return { sheet, openSheet: () => setOpen(true) }
}
