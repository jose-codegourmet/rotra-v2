'use client'

import { Button } from '@rotra/ui/button'
import { ClubLogo } from '@rotra/ui/club-logo'
import { cn } from '@rotra/ui/cn'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { useEffect, useRef, useState } from 'react'
import {
  drawSessionQr,
  loadSessionQrLogo,
  renderSessionQrPng,
  type SessionQrFormat,
} from './SessionJoinQr.helpers'

export type SessionJoinQrProps = {
  /** The visitor public session link, never the preview URL. */
  link: string
  /** Names the download rotra-session-<slug>-<post|story>.png. */
  slug: string
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string | null
  sessionTitle: string
  dateLabel: string
  timeLabel: string
  venueName: string
  initialFormat?: SessionQrFormat
  onDownloaded?: () => void
  onError?: (message: string) => void
}

/** Q-PREPARE's branded Post/Story image of the public session link, in fixed dark brand colors. */
export function SessionJoinQr({
  link,
  slug,
  clubName,
  clubInitials,
  clubLogoUrl,
  sessionTitle,
  dateLabel,
  timeLabel,
  venueName,
  initialFormat = 'post',
  onDownloaded,
  onError,
}: SessionJoinQrProps) {
  const [format, setFormat] = useState<SessionQrFormat>(initialFormat)
  const [logo, setLogo] = useState<{ url: string; image: HTMLImageElement | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const qr = drawSessionQr(link)
  const initials =
    clubInitials ??
    clubName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  const image = logo && logo.url === clubLogoUrl ? logo.image : null
  const logoLoading = !!clubLogoUrl && logo?.url !== clubLogoUrl
  const fileName = `rotra-session-${slug}-${format}.png`
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    let current = true
    if (clubLogoUrl)
      void loadSessionQrLogo(clubLogoUrl).then((loaded) => {
        if (current) setLogo({ url: clubLogoUrl, image: loaded })
      })
    return () => {
      current = false
    }
  }, [clubLogoUrl])
  useEffect(() => {
    try {
      const probe = new File([], fileName, { type: 'image/png' })
      setCanShare(
        typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [probe] }),
      )
    } catch {
      setCanShare(false)
    }
  }, [fileName])

  const makePng = async () => {
    const blob =
      qr && cardRef.current ? await renderSessionQrPng(cardRef.current, qr, image, format) : null
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
      onDownloaded?.()
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
        title: sessionTitle,
      })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        onError?.("Couldn't share the image here. Download the image instead.")
    } finally {
      setBusy(false)
    }
  }

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
      <div
        ref={cardRef}
        role="group"
        aria-label="Share image preview"
        className={cn(
          'flex flex-col justify-between gap-3.5 rounded-[20px] bg-share-bg px-5 text-share-fg [background-image:radial-gradient(120%_70%_at_50%_0%,var(--share-glow),transparent_60%)]',
          format === 'post'
            ? 'aspect-[4/5] w-[min(100%,320px)] pt-[22px] pb-[18px]'
            : 'aspect-[9/16] w-[min(100%,270px)] pt-7 pb-[22px]',
        )}
      >
        <div className="flex items-center justify-center gap-2.5 text-left">
          <span
            data-qr-logo
            className="size-10 shrink-0 overflow-hidden rounded-full bg-share-accent text-share-bg"
          >
            <ClubLogo
              initials={image ? '' : initials}
              logoUrl={image ? clubLogoUrl : null}
              className="size-full rounded-full border-0 bg-transparent text-[14px] text-share-bg"
            />
          </span>
          <div className="min-w-0">
            <b data-qr-text className="block text-[15px] leading-normal [overflow-wrap:anywhere]">
              {clubName}
            </b>
            <span data-qr-text className="text-[12px] text-share-muted">
              is playing badminton
            </span>
          </div>
        </div>
        <div>
          <h3
            data-qr-text
            className={cn(
              'm-0 mb-1.5 text-share-fg text-balance font-extrabold leading-[1.15] [overflow-wrap:anywhere]',
              format === 'post' ? 'text-[22px]' : 'text-[24px]',
            )}
          >
            {sessionTitle}
          </h3>
          <p className="m-0 text-[13px] text-share-muted leading-[1.4]">
            <span data-qr-text>{dateLabel}</span>
            <br />
            <span data-qr-text>
              {timeLabel} · {venueName}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          {qr ? (
            <div
              data-qr-tile
              role="img"
              aria-label={`QR code for the ${clubName} session link`}
              className={cn(
                'relative box-content rounded-[14px] bg-qr-bg p-2.5 text-qr-fg',
                format === 'post' ? 'w-[148px]' : 'w-[170px]',
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
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: `${(0.22 * qr.count * (format === 'post' ? 148 : 170)) / qr.size}px`,
                }}
              >
                <span
                  data-qr-logo
                  data-qr-center
                  className="block aspect-square size-full rounded-full bg-share-accent text-share-bg shadow-[0_0_0_6px_var(--qr-bg)]"
                >
                  <ClubLogo
                    initials={image ? '' : initials}
                    logoUrl={image ? clubLogoUrl : null}
                    className="aspect-square size-full rounded-full border-0 bg-transparent text-[11px] text-share-bg"
                  />
                </span>
              </div>
            </div>
          ) : (
            <p data-qr-text className="m-0 text-[13px] text-share-muted">
              The QR code couldn't be drawn here. Copy the invite link instead.
            </p>
          )}
          <b data-qr-text className="text-[15px] text-share-accent">
            Scan to join
          </b>
          <span
            data-qr-text
            className="font-mono text-[10px] text-share-muted [overflow-wrap:anywhere]"
          >
            {link}
          </span>
        </div>
        <div className="flex items-baseline justify-center gap-2 text-[12px] text-share-muted">
          <span className="font-extrabold text-share-fg tracking-[0.1em]">
            <span data-qr-text>ROTR</span>
            <b data-qr-text className="text-share-accent">
              A
            </b>
          </span>
          <span data-qr-text>Run the game.</span>
        </div>
      </div>
      <p className="m-0 text-fg2 text-sm">
        Scanning opens the public session page.{' '}
        {format === 'story'
          ? 'Story size (9:16) for Facebook and Instagram stories.'
          : 'Post size (4:5) for Facebook and Instagram feeds.'}{' '}
        Download the image to share it or print it.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {canShare ? (
          <Button disabled={!qr || busy || logoLoading} onClick={() => void share()}>
            Share
          </Button>
        ) : null}
        <Button
          variant="primary"
          disabled={!qr || busy || logoLoading}
          onClick={() => void download()}
        >
          Download image
        </Button>
      </div>
    </div>
  )
}
