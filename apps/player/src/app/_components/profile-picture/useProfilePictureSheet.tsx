'use client'
import { preparePlayerPhoto } from '@rotra/data/player/photo'
import { type PlayerPictureChoice, parsePlayerPicture } from '@rotra/data/player/picture'
import type { PlayerProfile } from '@rotra/data/player/types'
import { useSetMyProfilePicture } from '@rotra/data/player/useSetMyProfilePicture'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useShownProfileCharacters } from '@rotra/data/profile-character/useShownProfileCharacters'
import { ProfilePictureSheet } from '@rotra/ui/profile-picture-sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { pictureSrc } from './pictureSrc'

/** Both entry points share one local draft and persist only through Done. */
export function useProfilePictureSheet(profile: PlayerProfile | null | undefined) {
  const [open, setOpen] = useState(false)
  const mutation = useSetMyProfilePicture()
  const account = useMyAccount(profile?.playerId ?? null)
  const characters = useShownProfileCharacters()
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
      currentCharacterImage={pictureSrc(profile.picture, profile.playerId, profile.fullName)}
      previousPhoto={account.data?.avatarPreviousRef}
      characters={characters.data ?? []}
      onCommitDraft={async (choice, previousPhoto) => {
        await commit({ ...choice, previousPhoto })
      }}
      isPending={mutation.isPending}
      preparePhoto={preparePlayerPhoto}
      onCommit={commit}
    />
  ) : null
  return {
    sheet,
    openSheet: () => {
      if (characters.isError) {
        toast.error(characters.error.message)
        void characters.refetch()
        return
      }
      setOpen(true)
    },
  }
}
