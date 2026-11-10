'use client'
import type { ClubPlayerPictureState } from '@rotra/data/club-player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Pager } from '@rotra/ui/pager'
import { PROFILE_CHARACTER_IDS, profileCharacterUrl } from '@rotra/ui/profile-picture'
import type { PictureCharacter } from '@rotra/ui/profile-picture-sheet'
import { type ChangeEvent, useId, useState } from 'react'

const CHARACTERS_PER_PAGE = 8
const MAX_PHOTO_BYTES = 4 * 1024 * 1024

export type ClubPictureChoice =
  | { kind: 'photo'; file: File }
  | { kind: 'character'; characterId: string }

export type ClubPictureFieldProps = {
  playerId: string
  name: string
  picture: ClubPlayerPictureState
  /** Defaults to the eight illustrated faces derived from the player's identity */
  characters?: PictureCharacter[]
  onChange?: (choice: ClubPictureChoice) => void
  onRemove?: () => void
  onUsePrevious?: () => void
  /** A problem the caller met, such as "That image could not be read" */
  error?: string
  pending?: boolean
}

const KIND_LABEL = { photo: 'A photo', character: 'A character', initials: 'Initials' } as const

/**
 * Edit details › Profile picture. Every choice applies at once, independent of Save details. The
 * picture shown here is the one the club set; the file is read and cropped by the caller.
 */
export function ClubPictureField({
  playerId,
  name,
  picture,
  characters,
  onChange,
  onRemove,
  onUsePrevious,
  error,
  pending = false,
}: ClubPictureFieldProps) {
  const fileId = useId()
  const charsLabelId = useId()
  const pageLabelId = useId()
  const [fileError, setFileError] = useState<string>()
  const faces: PictureCharacter[] =
    characters ??
    PROFILE_CHARACTER_IDS.map((id) => ({ id, image: profileCharacterUrl(playerId, name, id) }))
  const pageCount = Math.max(1, Math.ceil(faces.length / CHARACTERS_PER_PAGE))
  const chosenIndex =
    picture.kind === 'character' ? faces.findIndex((face) => face.id === picture.characterId) : -1
  const [page, setPage] = useState(
    chosenIndex < 0 ? 1 : Math.floor(chosenIndex / CHARACTERS_PER_PAGE) + 1,
  )
  const current = Math.min(page, pageCount)
  const visible = faces.slice((current - 1) * CHARACTERS_PER_PAGE, current * CHARACTERS_PER_PAGE)
  const paged = pageCount > 1
  const currentSrc =
    picture.kind === 'character'
      ? (faces[chosenIndex]?.image ??
        (picture.characterId === null
          ? undefined
          : profileCharacterUrl(playerId, name, picture.characterId)))
      : picture.kind === 'photo'
        ? (picture.reference ?? undefined)
        : undefined
  const shownError = fileError ?? error

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setFileError('Choose an image file')
    if (file.size > MAX_PHOTO_BYTES) return setFileError('Choose an image under 4 MB')
    setFileError(undefined)
    onChange?.({ kind: 'photo', file })
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a group div; a fieldset would change the drawn layout
    <div
      className="flex min-w-0 flex-col gap-1.5"
      aria-busy={pending || undefined}
      role="group"
      aria-label="Profile picture"
    >
      <span className="text-[13px] font-semibold text-fg2">Profile picture</span>
      <div className="flex items-start gap-4">
        <Avatar name={name} src={currentSrc} size={64} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] text-fg2">{KIND_LABEL[picture.kind]}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" disabled={pending}>
              <label htmlFor={fileId}>Upload photo</label>
            </Button>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={pending}
              onChange={onFile}
            />
            {picture.kind !== 'initials' ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={onRemove}>
                Remove
              </Button>
            ) : null}
          </div>
          {picture.previousSrc ? (
            <div className="flex items-center gap-2.5">
              <Avatar name="Previous picture" src={picture.previousSrc} size={36} />
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-fg2">Previous picture</span>
                <div>
                  <Button size="sm" disabled={pending} onClick={onUsePrevious}>
                    Use previous picture
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <span id={charsLabelId} className="text-[13px] text-fg2">
        Choose a character
      </span>
      {paged ? (
        <span id={pageLabelId} className="sr-only">
          Characters, page {current} of {pageCount}
        </span>
      ) : null}
      {/* biome-ignore lint/a11y/useSemanticElements: a group div; a fieldset would change the drawn layout */}
      <div
        role="group"
        aria-labelledby={paged ? `${charsLabelId} ${pageLabelId}` : charsLabelId}
        className="grid max-w-80 grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2"
      >
        {visible.map((face) => {
          const number = faces.indexOf(face) + 1
          const chosen = picture.kind === 'character' && picture.characterId === face.id
          return (
            <button
              key={face.id}
              type="button"
              aria-pressed={chosen}
              aria-label={`Character ${number}`}
              disabled={pending}
              onClick={() => onChange?.({ kind: 'character', characterId: face.id })}
              className={cn(
                'grid min-h-[52px] min-w-[52px] cursor-pointer place-items-center rounded-full border-2 bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60',
                chosen ? 'border-accent bg-accent-subtle' : 'border-transparent',
              )}
            >
              <span aria-hidden="true">
                <Avatar name={`Character ${number}`} src={face.image} size={40} />
              </span>
            </button>
          )
        })}
      </div>
      {paged ? (
        <Pager
          page={current}
          pageCount={pageCount}
          onPage={setPage}
          disabled={pending}
          aria-label="Characters"
        />
      ) : null}
      <span className="text-xs font-normal text-fg2">
        Shown wherever this player appears in your club. When they claim their profile they can
        change it. Only the current and previous photo are kept.
      </span>
      <span aria-live="polite" className="text-[13px] font-semibold text-error empty:hidden">
        {shownError}
      </span>
    </div>
  )
}
