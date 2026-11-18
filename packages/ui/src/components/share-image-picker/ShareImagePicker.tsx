'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { CopyField } from '@rotra/ui/copy-field'
import { Icon } from '@rotra/ui/icon'
import {
  isAppleMobile,
  loadShareLogo,
  renderSharePng,
  type ShareFormat,
} from '@rotra/ui/share-card/helpers'
import { ShareImageViewer } from '@rotra/ui/share-image-viewer'
import { SnapCarousel } from '@rotra/ui/snap-carousel'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export type ShareImagePickerItem = {
  /** Stable id: the format ('story' | 'post' | 'square') or a page number */
  id: string
  /** Caption and accessible name: “Story”, “Facebook post”, “Square”, “Image 2” */
  label: string
  /** Muted line under the caption: “9:16 · Facebook and Instagram stories”, “#1–8 · You're here” */
  hint?: string
  format: ShareFormat
  /** Download file name without “.png”: “rotra-profile-story” */
  fileName: string
  /** The image at full size: a ShareImage */
  image: ReactNode
}

export type ShareImagePickerProps = {
  items: ShareImagePickerItem[]
  /** Title passed to the system share sheet */
  shareTitle: string
  /** Pictures drawn into the PNG, keyed by each picture's data-qr-logo name (`spot`, game avatars) */
  images?: Record<string, string | null | undefined>
  /** The link under OR; leave out (with onCopy) to hide the OR divider and the link field */
  link?: string
  /** “Profile link”, “Link”, “Session link” */
  linkLabel?: string
  /** Accessible name of the copy icon: “Copy profile link”, “Copy link” */
  copyLabel?: string
  onCopy?: () => void
  /** Sentence before the count; Player: “Tap an image to pick it.” */
  pickHint?: string
  /** “image” / “images” after the count (Share leaderboard: “2 of 3 images picked”) */
  countUnit?: { one: string; other: string }
  /** Left of the count, which then sits on the right (Share leaderboard's size switch) */
  toolbar?: ReactNode
  /** The image the carousel opens centred on (Share leaderboard: the one with your row) */
  startAt?: string
  /** Ids picked first; every image when left out */
  initialPicked?: string[]
  /** Overrides the browser's Web Share check (stories and tests) */
  webShare?: boolean
  /**
   * Overrides the iPhone / iPad check (stories and tests). There, with Web Share, Download becomes
   * Save to Photos: it opens the system share sheet, whose Save Image puts the PNGs in Photos.
   */
  saveToPhotos?: boolean
  /** Once per downloaded image, for the “<Label> image downloaded” toast */
  onDownloaded?: (item: ShareImagePickerItem) => void
  onShared?: () => void
  onError?: (message: string) => void
}

/**
 * The share dialog body (2026-11-13 share dialog logs): every image at full size in a compact
 * carousel (SnapCarousel: drag with the mouse, swipe on touch, snapping to the centre; a drag never
 * counts as a click; fade masks only on a side with hidden images; dots under it). Tapping an image picks or
 * unpicks it; all start picked. The eye opens it full screen. Download N images and Share act on the
 * picked images. Then the big OR and the link field with the copy icon inside.
 */
export function ShareImagePicker({
  items,
  shareTitle,
  images,
  link,
  linkLabel = 'Link',
  copyLabel,
  onCopy,
  pickHint = 'Tap an image to pick it; the eye shows it full screen.',
  countUnit,
  toolbar,
  initialPicked,
  startAt,
  webShare,
  saveToPhotos,
  onDownloaded,
  onShared,
  onError,
}: ShareImagePickerProps) {
  const idsKey = items.map((item) => item.id).join('|')
  const [picked, setPicked] = useState<string[]>(() => initialPicked ?? items.map((i) => i.id))
  const [pickedFor, setPickedFor] = useState(idsKey)
  // A new set of images (another size or kind) starts with every image picked again.
  if (pickedFor !== idsKey) {
    setPickedFor(idsKey)
    setPicked(initialPicked ?? items.map((item) => item.id))
  }
  const [viewing, setViewing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [detected, setDetected] = useState(false)
  const [apple, setApple] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, HTMLImageElement | null>>({})
  const cards = useRef(new Map<string, HTMLElement>())

  const chosen = items.filter((item) => picked.includes(item.id))
  const n = chosen.length
  const canShare = webShare ?? detected
  const photos = canShare && (saveToPhotos ?? apple)
  const imagesKey = JSON.stringify(images ?? {})
  const loading = Object.values(images ?? {}).some((url) => !!url && !(url in loaded))

  useEffect(() => {
    let current = true
    for (const url of new Set(Object.values(JSON.parse(imagesKey) as Record<string, string>)))
      if (url)
        void loadShareLogo(url).then((image) => {
          if (current) setLoaded((previous) => ({ ...previous, [url]: image }))
        })
    return () => {
      current = false
    }
  }, [imagesKey])
  useEffect(() => {
    try {
      const probe = new File([], 'rotra.png', { type: 'image/png' })
      setDetected(
        typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [probe] }),
      )
    } catch {
      setDetected(false)
    }
    setApple(isAppleMobile())
  }, [])

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : items.map((item) => item.id).filter((x) => x === id || current.includes(x)),
    )
  const allPicked = n === items.length

  const makePng = async (item: ShareImagePickerItem) => {
    const card = cards.current.get(item.id)
    const logos = Object.fromEntries(
      Object.entries(images ?? {}).map(([key, url]) => [key, url ? (loaded[url] ?? null) : null]),
    )
    return card ? renderSharePng(card, null, logos, item.format) : null
  }
  const download = async (list: ShareImagePickerItem[]) => {
    setBusy(true)
    try {
      for (const [index, item] of list.entries()) {
        // A short pause between files so browsers keep every download.
        if (index > 0) await new Promise((resolve) => setTimeout(resolve, 400))
        const blob = await makePng(item)
        if (!blob) {
          onError?.("Couldn't make the image. Try again.")
          continue
        }
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${item.fileName}.png`
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        onDownloaded?.(item)
      }
    } finally {
      setBusy(false)
    }
  }
  // Save to Photos uses the same share sheet; it reports nothing back, so it calls no callback.
  const share = async (list = chosen, save = false) => {
    setBusy(true)
    try {
      const files: File[] = []
      for (const item of list) {
        const blob = await makePng(item)
        if (blob) files.push(new File([blob], `${item.fileName}.png`, { type: 'image/png' }))
      }
      if (!files.length) {
        onError?.("Couldn't make the image. Try again.")
        return
      }
      await navigator.share({ files, title: shareTitle })
      if (!save) onShared?.()
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        onError?.(
          save
            ? "Couldn't open the share menu. Try again."
            : "Couldn't share the images here. Download them instead.",
        )
    } finally {
      setBusy(false)
    }
  }

  const viewed = items.find((item) => item.id === viewing) ?? null
  const disabled = busy || loading || n === 0
  const count = `${n} of ${items.length}${countUnit ? ` ${items.length === 1 ? countUnit.one : countUnit.other}` : ''} picked`
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className={cn(
          'flex w-full flex-wrap items-center gap-x-4 gap-y-2',
          toolbar ? 'justify-between' : 'justify-center',
        )}
      >
        {toolbar}
        <span className="text-sm text-fg2">
          {pickHint ? `${pickHint} ` : ''}
          {count} ·{' '}
          <button
            type="button"
            onClick={() => setPicked(allPicked ? [] : items.map((item) => item.id))}
            className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent"
          >
            {allPicked ? 'Clear' : 'Pick all'}
          </button>
        </span>
      </div>
      <SnapCarousel
        label="Images"
        startAt={startAt}
        dragIgnore="[data-share-eye]"
        itemClassName="group relative flex flex-col items-center gap-2"
        items={items.map((item) => {
          const on = picked.includes(item.id)
          return {
            id: item.id,
            node: (
              <>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${item.label}${item.hint ? `, ${item.hint}` : ''}. ${on ? 'Picked' : 'Not picked'}`}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'relative block cursor-pointer rounded-[23px] border-3 bg-transparent p-0 text-left leading-normal focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent',
                    on ? 'border-accent' : 'border-transparent',
                  )}
                >
                  <span
                    ref={(el) => {
                      const card = el?.firstElementChild as HTMLElement | null | undefined
                      if (card) cards.current.set(item.id, card)
                      else cards.current.delete(item.id)
                    }}
                    className="block"
                  >
                    {item.image}
                  </span>
                  <i
                    aria-hidden="true"
                    className={cn(
                      'absolute -top-[11px] -left-[11px] z-2 grid size-[30px] place-items-center rounded-full border-3 border-surface not-italic',
                      on ? 'bg-accent text-on-accent' : 'bg-overlay text-transparent',
                    )}
                  >
                    <Icon name="check" size={15} />
                  </i>
                </button>
                <button
                  type="button"
                  data-share-eye
                  onClick={() => setViewing(item.id)}
                  aria-label={`View ${item.label} full screen`}
                  title="View full screen"
                  className="absolute top-[15px] right-[15px] z-3 grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-share-eye p-0 text-photo-fg opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Icon name="eye" size={20} />
                </button>
                <span className="flex flex-col items-center">
                  <b className="text-sm">{item.label}</b>
                  {item.hint ? <span className="text-xs text-fg2">{item.hint}</span> : null}
                </span>
              </>
            ),
          }
        })}
      />
      <div className="flex flex-wrap justify-center gap-2">
        {photos ? (
          <Button disabled={disabled} onClick={() => void share(chosen, true)}>
            Save to Photos
          </Button>
        ) : (
          <Button disabled={disabled} onClick={() => void download(chosen)}>
            {n ? `Download ${n} ${n === 1 ? 'image' : 'images'}` : 'Download images'}
          </Button>
        )}
        {canShare ? (
          <Button variant="primary" disabled={disabled} onClick={() => void share()}>
            Share
          </Button>
        ) : null}
      </div>
      {photos ? (
        <p className="m-0 max-w-[34ch] text-[13px] leading-[1.45] text-fg2">
          Save to Photos opens the share menu. Tap{' '}
          <b className="text-fg">{n > 1 ? `Save ${n} Images` : 'Save Image'}</b> there.
        </p>
      ) : null}
      {link !== undefined && onCopy ? (
        <>
          <div className="my-1.5 flex w-full items-center gap-3.5">
            <hr className="m-0 h-px flex-1 border-0 bg-border-strong" />
            <span className="text-[18px] font-extrabold tracking-[2px] text-fg2">OR</span>
            <hr className="m-0 h-px flex-1 border-0 bg-border-strong" />
          </div>
          <CopyField label={linkLabel} value={link} copyLabel={copyLabel} onCopy={onCopy} />
        </>
      ) : null}
      {viewed ? (
        <ShareImageViewer
          open
          onClose={() => setViewing(null)}
          label={viewed.label}
          format={viewed.format}
          downloadDisabled={busy || loading}
          downloadLabel={photos ? 'Save to Photos' : undefined}
          onDownload={() => void (photos ? share([viewed], true) : download([viewed]))}
        >
          {viewed.image}
        </ShareImageViewer>
      ) : null}
    </div>
  )
}
