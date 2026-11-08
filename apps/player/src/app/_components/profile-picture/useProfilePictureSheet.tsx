'use client'
import { parsePlayerPicture, type PlayerPictureChoice } from '@rotra/data/player/picture'
import type { PlayerProfile } from '@rotra/data/player/types'
import { useSetMyProfilePicture } from '@rotra/data/player/useSetMyProfilePicture'
import { ProfilePictureSheet } from '@rotra/ui/profile-picture-sheet'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'

/** Opens the same immediate picture editor from My profile and Edit profile. */
export function useProfilePictureSheet(profile: PlayerProfile | null | undefined) {
  const [open, setOpen] = useState(false)
  const saving = useRef(false)
  const mutation = useSetMyProfilePicture()
  const choose = (choice: PlayerPictureChoice) => {
    if (saving.current) return
    saving.current = true
    mutation.mutate(choice, {
      onSuccess: () =>
        toast(choice.kind === 'initials' ? 'Using your initials' : 'Profile picture updated'),
      onError: (error) => toast.error(error.message),
      onSettled: () => {
        saving.current = false
      },
    })
  }
  const sheet = profile ? (
    <ProfilePictureSheet
      open={open}
      onOpenChange={setOpen}
      playerId={profile.playerId}
      name={profile.fullName}
      picture={parsePlayerPicture(profile.picture)}
      isPending={mutation.isPending}
      onUpload={(file) => choose({ kind: 'photo', file })}
      onUseInitials={() => choose({ kind: 'initials' })}
      onSelectCharacter={(id) => choose({ kind: 'character', id })}
    />
  ) : null
  return { sheet, openSheet: () => setOpen(true) }
}
