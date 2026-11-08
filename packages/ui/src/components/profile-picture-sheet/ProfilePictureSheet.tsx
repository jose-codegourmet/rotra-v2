'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import {
  PROFILE_CHARACTER_IDS,
  type ProfileCharacterId,
  type ProfilePicture,
  profileCharacterUrl,
} from '@rotra/ui/profile-picture'
import { Sheet } from '@rotra/ui/sheet'
import { useRef } from 'react'

export type ProfilePictureSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerId: string
  name: string
  picture: ProfilePicture
  isPending?: boolean
  onUpload: (file: File) => void
  onUseInitials: () => void
  onSelectCharacter: (id: ProfileCharacterId) => void
}

export function ProfilePictureSheet({
  open,
  onOpenChange,
  playerId,
  name,
  picture,
  isPending = false,
  onUpload,
  onUseInitials,
  onSelectCharacter,
}: ProfilePictureSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const src =
    picture.kind === 'photo'
      ? picture.src
      : picture.kind === 'character'
        ? profileCharacterUrl(playerId, name, picture.id)
        : undefined
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Profile picture"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3.5">
          <Avatar
            name={name}
            src={src}
            size={88}
            shape="square"
            tone={src ? 'neutral' : 'accent'}
          />
          <div className="flex flex-col gap-1">
            <b>
              {picture.kind === 'photo'
                ? 'Your photo'
                : picture.kind === 'character'
                  ? 'A character'
                  : 'Your initials'}
            </b>
            <span className="text-sm text-fg2">Everyone who sees your profile sees this.</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
            Upload a photo
          </Button>
          <input
            ref={inputRef}
            aria-label="Upload a photo"
            tabIndex={-1}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) onUpload(file)
              event.currentTarget.value = ''
            }}
          />
          <Button
            size="sm"
            disabled={isPending || picture.kind === 'initials'}
            onClick={onUseInitials}
          >
            Use my initials
          </Button>
        </div>
        <div>
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
            Or pick a character
          </span>
          <fieldset
            aria-label="Characters"
            className="m-0 grid min-w-0 grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2.5 border-0 p-0"
          >
            {PROFILE_CHARACTER_IDS.map((id, index) => (
              <button
                key={id}
                type="button"
                disabled={isPending}
                aria-label={`Character ${index + 1}`}
                aria-pressed={picture.kind === 'character' && picture.id === id}
                onClick={() => onSelectCharacter(id)}
                className="grid cursor-pointer place-items-center rounded-2xl border-2 border-transparent bg-transparent p-1 aria-pressed:border-accent"
              >
                <Avatar
                  name={name}
                  src={profileCharacterUrl(playerId, name, id)}
                  className="size-14"
                />
              </button>
            ))}
          </fieldset>
        </div>
        <p className="text-xs text-fg2">
          Photos stay on this device in the prototype. Keep it to a clear picture of you; the club's
          Queue Master can ask you to change it.
        </p>
      </div>
    </Sheet>
  )
}
