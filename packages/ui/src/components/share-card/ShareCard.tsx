'use client'

import { Button } from '@rotra/ui/button'
import { ClubLogo } from '@rotra/ui/club-logo'
import { cn } from '@rotra/ui/cn'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { drawShareQr, loadShareLogo, renderSharePng, type ShareFormat } from './ShareCard.helpers'

/** A round logo or avatar spot: the picture when it loads, otherwise the initials. */
export type ShareCardSpot = { initials: string; imageUrl?: string | null }

export type ShareCardProps = {
  /** Player cards replace the middle content and use a corner QR. Existing invite cards keep their layout. */
  children?: ReactNode | ((format: ShareFormat) => ReactNode)
  /** Extra avatar assets used by custom content, keyed by data-qr-logo. */
  additionalImages?: Record<string, string | null>
  compactQr?: boolean
  leadingAction?: ReactNode
  /** A full-width block on its own row directly above the Share / Download image row. */
  primaryRowAbove?: ReactNode
  /** The exact link the QR encodes and the card prints. */
  link: string
  /** Names the download <fileName>-<post|story>.png. */
  fileName: string
  /** Bold first line beside the spot (club name, player name). */
  headline: string
  /** Muted line under the headline ("is playing badminton", "invites you to play"). */
  subline?: string
  /** Logo or avatar spot beside the headline. */
  spot: ShareCardSpot
  /** Mark in the middle of the QR; defaults to the spot. */
  qrMark?: ShareCardSpot
  /** Big title in the middle of the card. */
  title: string
  /** Lines under the title, one per row. */
  infoLines: string[]
  /** Under the QR: "Scan to join" or "Waitlist open". */
  qrCaption: string
  /** Accessible name of the QR picture. */
  qrLabel: string
  /** Title given to the share sheet. */
  shareTitle: string
  /** Text before the format sentence under the card. */
  noteStart?: string
  /** Text after the format sentence under the card. */
  noteEnd?: string
  /** `both` shows Share (when available) and Download image; `share-or-download` shows one of them. */
  actions?: 'both' | 'share-or-download'
  initialFormat?: ShareFormat
  /** Overrides the browser's Web Share check (stories and tests). */
  webShare?: boolean
  onShared?: () => void
  onDownloaded?: (format: ShareFormat) => void
  onError?: (message: string) => void
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

/** The one branded Post/Story share image, drawn on the device in fixed dark brand colors. */
export function ShareCard({
  link,
  fileName: baseName,
  headline,
  subline,
  spot,
  qrMark,
  title,
  infoLines,
  qrCaption,
  qrLabel,
  shareTitle,
  noteStart,
  noteEnd,
  actions = 'both',
  initialFormat = 'post',
  webShare,
  onShared,
  onDownloaded,
  onError,
  children,
  compactQr = false,
  leadingAction,
  primaryRowAbove,
  additionalImages,
}: ShareCardProps) {
  const [format, setFormat] = useState<ShareFormat>(initialFormat)
  const [loaded, setLoaded] = useState<Record<string, HTMLImageElement | null>>({})
  const [busy, setBusy] = useState(false)
  const [detected, setDetected] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const qr = drawShareQr(link)
  const mark = qrMark ?? spot
  const fileName = `${baseName}-${format}.png`
  const spotUrl = spot.imageUrl ?? null
  const markUrl = mark.imageUrl ?? null
  const imageFor = (url: string | null) => (url && loaded[url] ? loaded[url] : null)
  const extraImageKey = JSON.stringify(additionalImages ?? {})
  const extraUrls = Object.values(additionalImages ?? {})
  const logoLoading = [spotUrl, markUrl, ...extraUrls].some((url) => !!url && !(url in loaded))
  const canShare = webShare ?? detected

  useEffect(() => {
    let current = true
    for (const url of new Set([
      spotUrl,
      markUrl,
      ...Object.values(JSON.parse(extraImageKey) as Record<string, string | null>),
    ]))
      if (url)
        void loadShareLogo(url).then((image) => {
          if (current) setLoaded((previous) => ({ ...previous, [url]: image }))
        })
    return () => {
      current = false
    }
  }, [spotUrl, markUrl, extraImageKey])
  useEffect(() => {
    try {
      const probe = new File([], fileName, { type: 'image/png' })
      setDetected(
        typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [probe] }),
      )
    } catch {
      setDetected(false)
    }
  }, [fileName])

  const makePng = async () => {
    const blob =
      qr && cardRef.current
        ? await renderSharePng(
            cardRef.current,
            qr,
            {
              spot: imageFor(spotUrl),
              mark: imageFor(markUrl),
              ...Object.fromEntries(
                Object.entries(additionalImages ?? {}).map(([key, url]) => [key, imageFor(url)]),
              ),
            },
            format,
          )
        : null
    if (!blob) onError?.("Couldn't make the QR image here. Copy the invite link instead.")
    return blob
  }
  const download = async () => {
    setBusy(true)
    try {
      const blob = await makePng()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      // Give the browser time to consume the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      onDownloaded?.(format)
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    setBusy(true)
    try {
      const blob = await makePng()
      if (!blob) return
      await navigator.share({
        files: [new File([blob], fileName, { type: 'image/png' })],
        title: shareTitle,
      })
      onShared?.()
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        onError?.("Couldn't share the image here. Download the image instead.")
    } finally {
      setBusy(false)
    }
  }

  const spotMark = (item: ShareCardSpot, url: string | null, name: string, text: string) => (
    <span
      data-qr-logo={name}
      className={cn(
        'shrink-0 overflow-hidden rounded-full bg-share-accent text-share-bg',
        name === 'spot' ? (compactQr ? 'size-13' : 'size-10') : '',
      )}
    >
      <ClubLogo
        initials={imageFor(url) ? '' : item.initials}
        logoUrl={imageFor(url) ? url : null}
        className={cn('size-full rounded-full border-0 bg-transparent text-share-bg', text)}
      />
    </span>
  )
  const disabled = !qr || busy || logoLoading
  const showShare = canShare
  const showDownload = actions === 'both' || !canShare

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <SegmentedControl
        aria-label="Image format"
        options={[
          { value: 'post', label: 'Post' },
          { value: 'story', label: 'Story' },
        ]}
        value={format}
        disabled={busy}
        onChange={(next) => setFormat(next === 'story' ? 'story' : 'post')}
      />
      <section
        ref={cardRef}
        aria-label="Share image preview"
        className={cn(
          'flex flex-col justify-between gap-3.5 rounded-[20px] bg-share-bg px-5 text-share-fg [background-image:radial-gradient(120%_70%_at_50%_0%,var(--share-glow),transparent_60%)]',
          format === 'post'
            ? 'aspect-[4/5] w-[min(100%,320px)] pt-[22px] pb-[18px]'
            : 'aspect-[9/16] w-[min(100%,270px)] pt-7 pb-[22px]',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center gap-2.5 text-left',
            compactQr && 'justify-start gap-3',
          )}
        >
          {spotMark(spot, spotUrl, 'spot', 'text-[14px]')}
          <div className="min-w-0">
            <b data-qr-text className="block text-[15px] leading-normal [overflow-wrap:anywhere]">
              {headline}
            </b>
            {subline ? (
              <span data-qr-text className="text-[12px] text-share-muted">
                {subline}
              </span>
            ) : null}
          </div>
        </div>
        {typeof children === 'function'
          ? children(format)
          : (children ?? (
              <div>
                <h3
                  data-qr-text
                  className={cn(
                    'm-0 mb-1.5 text-share-fg text-balance font-extrabold leading-[1.15] [overflow-wrap:anywhere]',
                    format === 'post' ? 'text-[22px]' : 'text-[24px]',
                  )}
                >
                  {title}
                </h3>
                <p className="m-0 text-[13px] text-share-muted leading-[1.4]">
                  {infoLines.map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed, ordered lines
                    <span key={index}>
                      {index > 0 ? <br /> : null}
                      <span data-qr-text>{line}</span>
                    </span>
                  ))}
                </p>
              </div>
            ))}
        <div
          className={cn(
            'flex items-center gap-2',
            compactQr ? 'flex-row-reverse justify-between' : 'flex-col gap-1.5',
          )}
        >
          {qr ? (
            <div
              data-qr-tile
              role="img"
              aria-label={qrLabel}
              className={cn(
                'relative box-content rounded-[14px] bg-qr-bg p-2.5 text-qr-fg',
                compactQr ? 'w-12 p-1 rounded-md' : format === 'post' ? 'w-[148px]' : 'w-[170px]',
              )}
            >
              <svg
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                shapeRendering="crispEdges"
                aria-hidden="true"
                className="block size-full"
              >
                <path d={qr.path} fill="currentColor" />
              </svg>
              {!compactQr && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: `${(0.22 * qr.count * (format === 'post' ? 148 : 170)) / qr.size}px`,
                  }}
                >
                  <span
                    data-qr-logo="mark"
                    data-qr-center
                    className="block aspect-square size-full rounded-full bg-share-accent text-share-bg shadow-[0_0_0_6px_var(--qr-bg)]"
                  >
                    <ClubLogo
                      initials={imageFor(markUrl) ? '' : mark.initials}
                      logoUrl={imageFor(markUrl) ? markUrl : null}
                      className="aspect-square size-full rounded-full border-0 bg-transparent text-[11px] text-share-bg"
                    />
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p data-qr-text className="m-0 text-[13px] text-share-muted">
              The QR code couldn't be drawn here. Copy the invite link instead.
            </p>
          )}
          {!compactQr && (
            <b data-qr-text className="text-[15px] text-share-accent">
              {qrCaption}
            </b>
          )}
          {compactQr ? (
            <div className="text-left">
              <span className="block text-[13px] font-extrabold tracking-[0.1em]">
                <span data-qr-text>ROTR</span>
                <b data-qr-text className="text-share-accent">
                  A
                </b>
              </span>
              <span data-qr-text className="text-[11px] text-share-muted">
                Run the game.
              </span>
            </div>
          ) : (
            <span
              data-qr-text
              className="font-mono text-[10px] text-share-muted [overflow-wrap:anywhere]"
            >
              {link}
            </span>
          )}
        </div>
        {!compactQr && (
          <div className="flex items-baseline justify-center gap-2 text-[12px] text-share-muted">
            <span className="font-extrabold text-share-fg tracking-[0.1em]">
              <span data-qr-text>ROTR</span>
              <b data-qr-text className="text-share-accent">
                A
              </b>
            </span>
            <span data-qr-text>Run the game.</span>
          </div>
        )}
      </section>
      <p className="m-0 text-fg2 text-sm">
        {noteStart ? `${noteStart} ` : ''}
        {format === 'story'
          ? 'Story size (9:16) for Facebook and Instagram stories.'
          : 'Post size (4:5) for Facebook and Instagram feeds.'}
        {noteEnd ? ` ${noteEnd}` : ''}
      </p>
      {primaryRowAbove ? <div className="flex flex-col">{primaryRowAbove}</div> : null}
      <div className="flex flex-wrap justify-center gap-2">
        {leadingAction}
        {showShare ? (
          <Button
            variant={showDownload ? undefined : 'primary'}
            disabled={disabled}
            onClick={() => void share()}
          >
            Share
          </Button>
        ) : null}
        {showDownload ? (
          <Button variant="primary" disabled={disabled} onClick={() => void download()}>
            Download image
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export type SessionInviteCardProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  /** Link with the player's ?invite=<code>. */
  link: string
  /** Names the download rotra-invite-<slug>-<post|story>.png. */
  slug: string
  inviterName: string
  inviterInitials?: string
  inviterAvatarUrl?: string | null
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string | null
  sessionTitle: string
  dateLabel: string
  timeLabel: string
  venueName: string
  /** True when the session is full: the QR caption reads "Waitlist open". */
  waitlistOpen?: boolean
}

/** Q-PUBLIC-JOIN's Session invite: "NAME invites you to play" with the player's avatar spot. */
export function SessionInviteCard({
  link,
  slug,
  inviterName,
  inviterInitials,
  inviterAvatarUrl,
  clubName,
  clubInitials,
  clubLogoUrl,
  sessionTitle,
  dateLabel,
  timeLabel,
  venueName,
  waitlistOpen = false,
  ...rest
}: SessionInviteCardProps) {
  return (
    <ShareCard
      {...rest}
      link={link}
      fileName={`rotra-invite-${slug}`}
      headline={inviterName}
      subline="invites you to play"
      spot={{ initials: inviterInitials ?? initialsOf(inviterName), imageUrl: inviterAvatarUrl }}
      qrMark={{ initials: clubInitials ?? initialsOf(clubName), imageUrl: clubLogoUrl }}
      title={sessionTitle}
      infoLines={[dateLabel, `${timeLabel} · ${venueName}`, clubName]}
      qrCaption={waitlistOpen ? 'Waitlist open' : 'Scan to join'}
      qrLabel={`QR code for the ${clubName} session link`}
      shareTitle={`${inviterName} invites you to play`}
      noteEnd="The Queue Master sees who invited each person who joins through it."
      actions="share-or-download"
    />
  )
}
