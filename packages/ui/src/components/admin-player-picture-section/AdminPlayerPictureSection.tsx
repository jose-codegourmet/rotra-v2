'use client'

import type { ProfileCharacter } from '@rotra/data/profile-character/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Pager } from '@rotra/ui/pager'
import { useRef, useState } from 'react'

/** A picture the form can hold: initials, a cropped photo, or a library character with its image. */
export type AdminPlayerPictureChoice =
  | { kind: 'initials' }
  | { kind: 'photo'; src: string }
  | { kind: 'character'; id: string; image: string }

/** Only the fields the picker needs from the library: shown images, in upload order. */
export type AdminPlayerPictureCharacter = Pick<ProfileCharacter, 'id' | 'image' | 'number'>

export type AdminPlayerPictureSectionProps = {
  /** Full name: gives the initials and the picture description */
  name: string
  /** The draft the form holds; what the preview shows */
  picture: AdminPlayerPictureChoice
  /** The saved picture; the caption reads "Current picture" while the draft equals it */
  savedPicture: AdminPlayerPictureChoice
  /** The picture before the saved one. The row is hidden when absent or equal to the draft */
  previousPicture?: AdminPlayerPictureChoice | null
  /** Shown library images only, in upload order, 8 per page */
  characters: AdminPlayerPictureCharacter[]
  /**
   * Receives a PNG, JPG or WebP file of up to 1 MB. The form crops it to a square and sets the
   * draft. Reject (throw) when the file cannot be read as an image.
   */
  onUpload: (file: File) => void | Promise<void>
  onUseInitials: () => void
  onUsePrevious: () => void
  onPickCharacter: (id: string) => void
  /** An error from outside, shown under the buttons when no upload error of its own is showing */
  error?: string | null
  /** The form is saving: every control is off */
  disabled?: boolean
  className?: string
}

export const PICTURE_UPLOAD_ERRORS = {
  type: 'Choose a PNG, JPG or WebP image.',
  size: 'That image is over 1 MB. Choose a smaller one.',
  unreadable: "That file couldn't be read as an image.",
} as const

export const PICTURE_UPLOAD_MAX_BYTES = 1024 * 1024
const PAGE_SIZE = 8

const pictureKey = (picture: AdminPlayerPictureChoice) =>
  picture.kind === 'initials'
    ? 'initials'
    : picture.kind === 'photo'
      ? `photo:${picture.src}`
      : `character:${picture.id}`

const pictureLabel = (picture: AdminPlayerPictureChoice) =>
  picture.kind === 'initials' ? 'Initials' : picture.kind === 'photo' ? 'Photo' : 'Character'

const pictureSrc = (picture: AdminPlayerPictureChoice) =>
  picture.kind === 'photo' ? picture.src : picture.kind === 'character' ? picture.image : undefined

/** The Edit player form's Profile picture section: inline, saved by the form's Save changes. */
export function AdminPlayerPictureSection({
  name,
  picture,
  savedPicture,
  previousPicture = null,
  characters,
  onUpload,
  onUseInitials,
  onUsePrevious,
  onPickCharacter,
  error = null,
  disabled = false,
  className,
}: AdminPlayerPictureSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [uploadError, setUploadError] = useState('')
  const pageCount = Math.max(1, Math.ceil(characters.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const shown = characters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const previous =
    previousPicture && pictureKey(previousPicture) !== pictureKey(picture) ? previousPicture : null
  const message = uploadError || error

  const upload = async (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setUploadError(PICTURE_UPLOAD_ERRORS.type)
      return
    }
    if (file.size > PICTURE_UPLOAD_MAX_BYTES) {
      setUploadError(PICTURE_UPLOAD_ERRORS.size)
      return
    }
    setUploadError('')
    try {
      await onUpload(file)
    } catch {
      setUploadError(PICTURE_UPLOAD_ERRORS.unreadable)
    }
  }

  return (
    <section
      aria-label="Profile picture"
      className={cn('flex flex-col gap-2.5 border-t border-border pt-2.5', className)}
    >
      <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
        Profile picture
      </span>
      <div className="flex items-center gap-3">
        <Avatar
          name={name}
          src={pictureSrc(picture)}
          size={64}
          tone={picture.kind === 'initials' ? 'accent' : 'neutral'}
          className="size-[72px] text-[22px]"
        />
        <div className="flex flex-col gap-1">
          <b>{pictureLabel(picture)}</b>
          <span className="text-sm text-fg2">
            {pictureKey(picture) === pictureKey(savedPicture)
              ? 'Current picture'
              : 'Changes when you save'}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          Upload a photo
        </Button>
        <input
          ref={inputRef}
          aria-label="Upload a photo"
          tabIndex={-1}
          className="sr-only"
          type="file"
          disabled={disabled}
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) void upload(file)
            event.currentTarget.value = ''
          }}
        />
        <Button
          size="sm"
          disabled={disabled || picture.kind === 'initials'}
          onClick={onUseInitials}
        >
          Use initials
        </Button>
      </div>
      <span className="text-xs text-fg2">PNG, JPG or WebP, up to 1 MB. Cropped to a square.</span>
      {message ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-error">
          {message}
        </p>
      ) : null}
      {previous ? (
        <div className="flex items-center justify-between gap-2.5 rounded-sm border border-border px-2.5 py-2">
          <div className="flex items-center gap-3">
            <Avatar name={name} src={pictureSrc(previous)} size={40} />
            <div className="flex flex-col gap-0.5">
              <b>Previous picture</b>
              <span className="text-sm text-fg2">{pictureLabel(previous)}</span>
            </div>
          </div>
          <Button size="xs" disabled={disabled} onClick={onUsePrevious}>
            Use previous picture
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-fg2">Or pick a character</span>
        <fieldset
          aria-label={`Characters, page ${currentPage} of ${pageCount}`}
          disabled={disabled}
          className="m-0 grid min-w-0 grid-cols-4 gap-2.5 border-0 p-0"
        >
          {shown.map(({ id, image, number }) => (
            <button
              key={id}
              type="button"
              aria-label={`Character ${number}`}
              aria-pressed={picture.kind === 'character' && picture.id === id}
              onClick={() => onPickCharacter(id)}
              className="block aspect-square w-full cursor-pointer overflow-hidden rounded-[14px] border border-border bg-elev p-0 disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:outline-[3px] aria-pressed:outline-offset-2 aria-pressed:outline-accent"
            >
              <img src={image} alt="" className="block size-full object-cover" />
            </button>
          ))}
        </fieldset>
        {pageCount > 1 ? (
          <Pager
            page={currentPage}
            pageCount={pageCount}
            onPage={setPage}
            aria-label="Character pages"
            disabled={disabled}
          />
        ) : null}
      </div>
    </section>
  )
}
