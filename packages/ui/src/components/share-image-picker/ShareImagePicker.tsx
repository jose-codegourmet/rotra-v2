'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { CopyField } from '@rotra/ui/copy-field'
import { Icon } from '@rotra/ui/icon'
import { loadShareLogo, renderSharePng, type ShareFormat } from '@rotra/ui/share-card/helpers'
import { ShareImageViewer } from '@rotra/ui/share-image-viewer'
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

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
  /** Ids picked first; every image when left out */
  initialPicked?: string[]
  /** Overrides the browser's Web Share check (stories and tests) */
  webShare?: boolean
  /** Once per downloaded image, for the “<Label> image downloaded” toast */
  onDownloaded?: (item: ShareImagePickerItem) => void
  onShared?: () => void
  onError?: (message: string) => void
}

/**
 * The share dialog body (2026-11-13 share dialog logs): every image at full size in a compact
 * carousel (drag with the mouse, swipe on touch, snapping to the centre; a drag never counts as a
 * click; fade masks only on a side with hidden images; dots under it). Tapping an image picks or
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
  webShare,
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
  const [loaded, setLoaded] = useState<Record<string, HTMLImageElement | null>>({})
  const [edges, setEdges] = useState({ left: false, right: false, active: 0 })
  const [dragging, setDragging] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const cards = useRef(new Map<string, HTMLElement>())
  const drag = useRef<{ x: number; left: number } | null>(null)
  const moved = useRef(false)

  const chosen = items.filter((item) => picked.includes(item.id))
  const n = chosen.length
  const canShare = webShare ?? detected
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
  }, [])

  // The prototypes' shCarSync: masks on the sides with hidden images, the dot of the centred image.
  const sync = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth - 2
    const mid = el.scrollLeft + el.clientWidth / 2
    let active = 0
    let best = Number.POSITIVE_INFINITY
    Array.from(el.children).forEach((child, index) => {
      const item = child as HTMLElement
      const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - mid)
      if (distance < best) {
        best = distance
        active = index
      }
    })
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max, active })
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the set of images changes
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sync, idsKey])

  // Mouse drag scrolls the strip; touch scrolls natively.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = stripRef.current
    if (!el || event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as Element).closest('[data-share-eye]')) return
    drag.current = { x: event.clientX, left: el.scrollLeft }
    moved.current = false
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      if (!moved.current && Math.abs(dx) > 6) {
        moved.current = true
        setDragging(true)
      }
      if (moved.current) el.scrollLeft = d.left - dx
    }
    const up = () => {
      drag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved.current) {
        setDragging(false)
        setTimeout(() => {
          moved.current = false
        }, 0)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

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
  const share = async () => {
    setBusy(true)
    try {
      const files: File[] = []
      for (const item of chosen) {
        const blob = await makePng(item)
        if (blob) files.push(new File([blob], `${item.fileName}.png`, { type: 'image/png' }))
      }
      if (!files.length) {
        onError?.("Couldn't make the image. Try again.")
        return
      }
      await navigator.share({ files, title: shareTitle })
      onShared?.()
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        onError?.("Couldn't share the images here. Download them instead.")
    } finally {
      setBusy(false)
    }
  }

  const viewed = items.find((item) => item.id === viewing) ?? null
  const disabled = busy || loading || n === 0
  const count = `${n} of ${items.length}${countUnit ? ` ${items.length === 1 ? countUnit.one : countUnit.other}` : ''} picked`
  // Masks are alpha only: the gradient colour never shows.
  const mask =
    edges.left && edges.right
      ? '[mask-image:linear-gradient(90deg,transparent,black_64px,black_calc(100%-64px),transparent)]'
      : edges.left
        ? '[mask-image:linear-gradient(90deg,transparent,black_64px)]'
        : edges.right
          ? '[mask-image:linear-gradient(270deg,transparent,black_64px)]'
          : ''

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
      {/* biome-ignore lint/a11y/useSemanticElements: an ARIA carousel group is not a form fieldset. */}
      <div
        ref={stripRef}
        role="group"
        aria-label="Images"
        onScroll={sync}
        onPointerDown={onPointerDown}
        onClickCapture={(event) => {
          if (moved.current) {
            event.preventDefault()
            event.stopPropagation()
            moved.current = false
          }
        }}
        className={cn(
          'flex w-full cursor-grab snap-x snap-mandatory scroll-px-6 items-start gap-5 overflow-x-auto overscroll-x-contain px-6 pt-3 pb-1.5 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:[-webkit-user-drag:none] [&_svg]:[-webkit-user-drag:none]',
          dragging && 'cursor-grabbing snap-none [&_*]:pointer-events-none',
          mask,
        )}
      >
        {items.map((item) => {
          const on = picked.includes(item.id)
          return (
            <div
              key={item.id}
              className="group relative flex flex-none snap-center flex-col items-center gap-2"
            >
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
            </div>
          )
        })}
      </div>
      {items.length > 1 ? (
        <div aria-hidden="true" className="flex justify-center gap-1.5">
          {items.map((item, index) => (
            <i
              key={item.id}
              className={cn(
                'block h-[7px] rounded-full',
                index === edges.active ? 'w-[18px] bg-accent' : 'w-[7px] bg-border-strong',
              )}
            />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Button disabled={disabled} onClick={() => void download(chosen)}>
          {n ? `Download ${n} ${n === 1 ? 'image' : 'images'}` : 'Download images'}
        </Button>
        {canShare ? (
          <Button variant="primary" disabled={disabled} onClick={() => void share()}>
            Share
          </Button>
        ) : null}
      </div>
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
          onDownload={() => void download([viewed])}
        >
          {viewed.image}
        </ShareImageViewer>
      ) : null}
    </div>
  )
}
