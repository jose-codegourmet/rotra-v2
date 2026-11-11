'use client'

import type { PictureCrop, PlayerPictureChoice } from '@rotra/data/player/picture'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { CharacterPicker } from '@rotra/ui/character-picker'
import { PROFILE_CHARACTER_IDS, profileCharacterUrl } from '@rotra/ui/profile-picture'
import { Sheet } from '@rotra/ui/sheet'
import { useEffect, useRef, useState } from 'react'

export type PictureCharacter = { id: string; image: string }
export type PictureDraftChoice =
  | { kind: 'initials' }
  | { kind: 'character'; id: string }
  | { kind: 'photo'; src: string }
  | { kind: 'photo'; file: File; crop?: PictureCrop }

export type ProfilePictureSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerId: string
  name: string
  picture: { kind: 'initials' } | { kind: 'photo'; src: string } | { kind: 'character'; id: string }
  characters?: PictureCharacter[]
  previousPhoto?: string | null
  currentCharacterImage?: string
  onCommitDraft?: (choice: PictureDraftChoice, previousPhoto: string | null) => Promise<unknown>
  isPending?: boolean
  preparePhoto: (file: File, signal?: AbortSignal) => Promise<File>
  onCommit: (choice: PlayerPictureChoice) => Promise<unknown>
}

/** Mount a fresh draft each time; dismissal releases the File and preview URL. */
export function ProfilePictureSheet(props: ProfilePictureSheetProps) {
  return props.open ? <PictureDraft {...props} /> : null
}

function PictureDraft({
  onOpenChange,
  playerId,
  name,
  picture,
  characters = PROFILE_CHARACTER_IDS.map((id) => ({
    id,
    image: profileCharacterUrl(playerId, name, id),
  })),
  previousPhoto = null,
  currentCharacterImage,
  onCommitDraft,
  isPending = false,
  preparePhoto,
  onCommit,
}: ProfilePictureSheetProps) {
  const frozen = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const selection = useRef(0)
  const saving = useRef(false)
  const preparation = useRef<AbortController | null>(null)
  const drag = useRef<{
    id: number
    x: number
    y: number
    crop: PictureCrop
    side: number
    size: number
  } | null>(null)
  const [choice, setChoice] = useState<PictureDraftChoice | null>(null)
  const [previous, setPrevious] = useState<string | null>(previousPhoto)
  const [crop, setCrop] = useState<PictureCrop>({ x: 0.5, y: 0.5, zoom: 1, rotation: 0 })
  const [url, setUrl] = useState<string>()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [preparing, setPreparing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const pending = isPending || committing
  const file = choice?.kind === 'photo' && 'file' in choice ? choice.file : null
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      selection.current++
      preparation.current?.abort()
    }
  }, [])
  useEffect(() => {
    if (!file) {
      setUrl(undefined)
      return
    }
    const preview = URL.createObjectURL(file)
    setUrl(preview)
    return () => URL.revokeObjectURL(preview)
  }, [file])
  const selected = choice ?? picture
  const src =
    selected.kind === 'photo'
      ? 'file' in selected
        ? url
        : selected.src
      : selected.kind === 'character'
        ? (characters.find((item) => item.id === selected.id)?.image ??
          (picture.kind === 'character' && selected.id === picture.id
            ? currentCharacterImage
            : undefined))
        : undefined
  const width = dimensions.width
  const height = dimensions.height
  const side = Math.max(1, Math.floor(Math.min(width, height) / crop.zoom))
  const left = Math.round((width - side) * crop.x)
  const top = Math.round((height - side) * crop.y)
  const previewStyle = {
    width: `${(dimensions.width / side) * 100}%`,
    height: `${(dimensions.height / side) * 100}%`,
    left: `${((width / 2 - left) / side) * 100}%`,
    top: `${((height / 2 - top) / side) * 100}%`,
    transform: 'translate(-50%, -50%)',
  }
  const select = (next: PictureDraftChoice) => {
    if (next.kind === 'photo' && 'src' in next) {
      setPrevious(selected.kind === 'photo' && 'src' in selected ? selected.src : null)
    } else if (selected.kind === 'photo' && 'src' in selected) {
      setPrevious(selected.src)
    }
    selection.current++
    drag.current = null
    preparation.current?.abort()
    setPreparing(false)
    setError('')
    setChoice(next)
  }
  const upload = async (input: File) => {
    preparation.current?.abort()
    const controller = new AbortController()
    preparation.current = controller
    const id = ++selection.current
    setPreparing(true)
    setError('')
    try {
      const prepared = await preparePhoto(input, controller.signal)
      if (!alive.current || id !== selection.current) return
      setDimensions({ width: 0, height: 0 })
      setCrop({ x: 0.5, y: 0.5, zoom: 1, rotation: 0 })
      if (selected.kind === 'photo' && 'src' in selected) setPrevious(selected.src)
      setChoice({ kind: 'photo', file: prepared })
    } catch (cause) {
      if (alive.current && id === selection.current)
        setError(cause instanceof Error ? cause.message : "Couldn't read that photo.")
    } finally {
      if (alive.current && id === selection.current) setPreparing(false)
    }
  }
  const done = async () => {
    if (saving.current || pending || preparing) return
    if (!choice) {
      onOpenChange(false)
      return
    }
    saving.current = true
    setCommitting(true)
    setError('')
    try {
      const result = choice.kind === 'photo' && 'file' in choice ? { ...choice, crop } : choice
      if (onCommitDraft) await onCommitDraft(result, previous)
      else if (result.kind === 'photo' && 'src' in result) {
        throw new Error("Couldn't save your picture. Try again.")
      } else if (result.kind === 'character') {
        const id = PROFILE_CHARACTER_IDS.find((candidate) => candidate === result.id)
        if (id === undefined) throw new Error("Couldn't save your picture. Try again.")
        await onCommit({ kind: 'character', id })
      } else await onCommit(result)
      if (alive.current) onOpenChange(false)
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "Couldn't save your picture. Try again.")
    } finally {
      saving.current = false
      if (alive.current) setCommitting(false)
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!saving.current && !isPending) onOpenChange(open)
      }}
      hideClose={pending}
      dismissible={!pending}
      title="Profile picture"
      footer={
        <Button
          variant="primary"
          disabled={pending || preparing || (!!file && !dimensions.width)}
          onClick={done}
        >
          {pending ? 'Saving…' : 'Done'}
        </Button>
      }
    >
      <div className="flex flex-col gap-3.5" aria-busy={pending || preparing}>
        <div className="flex items-center gap-3.5">
          <Avatar name={name} src={src} size={88} tone={src ? 'neutral' : 'accent'} />
          <div className="flex flex-col gap-1">
            <b>
              {selected.kind === 'photo'
                ? 'Your photo'
                : selected.kind === 'character'
                  ? 'A character'
                  : 'Your initials'}
            </b>
            <span className="text-sm text-fg2">Everyone who sees your profile sees this.</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            Upload a photo
          </Button>
          <input
            ref={inputRef}
            aria-label="Upload a photo"
            tabIndex={-1}
            className="sr-only"
            type="file"
            disabled={pending}
            accept="image/webp,image/gif,image/png,image/heic,image/heif,image/jpeg,.heic,.heif"
            onChange={(event) => {
              const input = event.currentTarget.files?.[0]
              if (input) void upload(input)
              event.currentTarget.value = ''
            }}
          />
          <Button
            size="sm"
            disabled={pending || selected.kind === 'initials'}
            onClick={() => select({ kind: 'initials' })}
          >
            Use my initials
          </Button>
          {selected.kind === 'photo' ? (
            <Button size="sm" disabled={pending} onClick={() => select({ kind: 'initials' })}>
              Remove
            </Button>
          ) : null}
        </div>
        {previous && !file && !preparing ? (
          <div className="flex items-center gap-3.5">
            <Avatar name={name} src={previous} size={64} />
            <div className="flex flex-col gap-1">
              <b>Previous picture</b>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => select({ kind: 'photo', src: previous })}
              >
                Use previous picture
              </Button>
            </div>
          </div>
        ) : null}
        {preparing ? (
          <p role="status" className="text-sm text-fg2">
            Preparing your photo…
          </p>
        ) : null}
        {file && url ? (
          <fieldset
            disabled={pending || preparing}
            className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0"
          >
            <legend className="sr-only">Frame your photo</legend>
            <button
              type="button"
              aria-label="Frame your photo"
              disabled={!dimensions.width}
              aria-description="Drag to crop, or use the arrow keys."
              className="relative block aspect-square w-full max-w-64 touch-none cursor-grab overflow-hidden rounded-[14px] border-0 bg-elev p-0 focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
              onPointerDown={(event) => {
                if (event.button !== 0) return
                drag.current = {
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  crop,
                  side,
                  size: event.currentTarget.getBoundingClientRect().width,
                }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                const start = drag.current
                if (!start || start.id !== event.pointerId) return
                const clamp = (value: number) => Math.max(0, Math.min(1, value))
                setCrop((current) => ({
                  ...current,
                  x:
                    width === start.side
                      ? 0.5
                      : clamp(
                          start.crop.x -
                            ((event.clientX - start.x) * start.side) /
                              start.size /
                              (width - start.side),
                        ),
                  y:
                    height === start.side
                      ? 0.5
                      : clamp(
                          start.crop.y -
                            ((event.clientY - start.y) * start.side) /
                              start.size /
                              (height - start.side),
                        ),
                }))
              }}
              onPointerUp={() => {
                drag.current = null
              }}
              onPointerCancel={() => {
                drag.current = null
              }}
              onLostPointerCapture={() => {
                drag.current = null
              }}
              onKeyDown={(event) => {
                const directions: Record<string, ['x' | 'y', number]> = {
                  ArrowLeft: ['x', 0.03],
                  ArrowRight: ['x', -0.03],
                  ArrowUp: ['y', 0.03],
                  ArrowDown: ['y', -0.03],
                }
                const direction = directions[event.key]
                if (!direction) return
                event.preventDefault()
                const [key, delta] = direction
                setCrop((current) => ({
                  ...current,
                  [key]: Math.max(0, Math.min(1, current[key] + delta)),
                }))
              }}
            >
              <img
                key={url}
                src={url}
                alt="Crop preview"
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none motion-reduce:invisible"
                onLoad={(event) => {
                  const image = event.currentTarget
                  if (image.naturalWidth * image.naturalHeight > 24_000_000) {
                    setDimensions({ width: 0, height: 0 })
                    setError('Choose a photo with fewer than 24 million pixels.')
                    return
                  }
                  setDimensions({ width: image.naturalWidth, height: image.naturalHeight })
                  const canvas = frozen.current
                  if (canvas) {
                    const scale = Math.min(
                      1,
                      1024 / Math.max(image.naturalWidth, image.naturalHeight),
                    )
                    canvas.width = Math.round(image.naturalWidth * scale)
                    canvas.height = Math.round(image.naturalHeight * scale)
                    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
                  }
                }}
                onError={() => {
                  setDimensions({ width: 0, height: 0 })
                  setError('That photo could not be decoded. Choose another image.')
                }}
                style={previewStyle}
              />
              <canvas
                ref={frozen}
                role="img"
                aria-label="Crop preview"
                className="pointer-events-none absolute hidden max-w-none motion-reduce:block"
                style={previewStyle}
              />
            </button>
            <p className="text-sm text-fg2">Drag to crop.</p>
            <label className="flex flex-col gap-1 text-sm text-fg2">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={crop.zoom}
                className="min-h-11 w-full accent-accent"
                onChange={(event) => {
                  const zoom = Number(event.currentTarget.value)
                  setCrop((current) => ({ ...current, zoom }))
                }}
              />
            </label>
          </fieldset>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
        <div>
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
            Or pick a character
          </span>
          <CharacterPicker
            characters={characters}
            name={name}
            selectedId={selected.kind === 'character' ? selected.id : null}
            onSelect={(id) => select({ kind: 'character', id })}
            disabled={pending}
          />
        </div>
        <p className="text-xs text-fg2">
          Only your current and previous photo are kept. Changes are saved only when you click Done.
          WebP, GIF, PNG, HEIC/HEIF and JPEG. Keep it to a clear picture of you; the club's Queue
          Master can ask you to change it.
        </p>
      </div>
    </Sheet>
  )
}
