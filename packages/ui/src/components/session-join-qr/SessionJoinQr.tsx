'use client'

import { Button } from '@rotra/ui/button'
import { useEffect, useState } from 'react'
import { drawQr } from '../player-id-qr/PlayerIdQr.helpers'
import { renderSessionQrPng } from './SessionJoinQr.helpers'

export type SessionJoinQrProps = {
  /** The visitor public session link (origin + /s/<publicSlug>); the QR holds exactly this */
  link: string
  /** Public slug; names the downloaded file rotra-session-<slug>.png */
  slug: string
  /** Club name, printed on the image */
  clubName: string
  /** Day, date and time, e.g. "Sat, Nov 8 · 7:00 PM–10:00 PM" */
  whenLabel: string
  venueName: string
  /** Called after the image is handed to the browser, or when it can't be made */
  onDownloaded?: () => void
  onError?: (message: string) => void
}

/**
 * Q-PREPARE's Session QR body: a scannable QR of the public session link (dark on light in both
 * themes so it scans), the title line, the link, Download QR image and Share where supported.
 */
export function SessionJoinQr({
  link,
  slug,
  clubName,
  whenLabel,
  venueName,
  onDownloaded,
  onError,
}: SessionJoinQrProps) {
  const qr = link ? drawQr(link) : null
  const detail = `${whenLabel} · ${venueName}`
  const fileName = `rotra-session-${slug}.png`
  const [canShare, setCanShare] = useState(false)
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
    const blob = await renderSessionQrPng({ link, titleLines: [clubName, detail] })
    if (!blob) onError?.("Couldn't make the QR image here. Copy the invite link instead.")
    return blob
  }
  const download = async () => {
    const blob = await makePng()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    onDownloaded?.()
  }
  const share = async () => {
    const blob = await makePng()
    if (!blob) return
    try {
      await navigator.share({
        files: [new File([blob], fileName, { type: 'image/png' })],
        title: clubName,
        text: `${clubName} · ${detail}`,
      })
    } catch {
      // Cancelled by the user (AbortError) or refused: nothing to report.
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {qr ? (
        <div
          role="img"
          aria-label={`QR code for the ${clubName} session link`}
          className="aspect-square w-[min(260px,100%)] rounded-[16px] bg-qr-bg p-3.5 text-qr-fg"
        >
          <svg
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            shapeRendering="crispEdges"
            aria-hidden="true"
            className="block size-full"
          >
            <path d={qr.path} fill="currentColor" />
          </svg>
        </div>
      ) : (
        <p className="m-0 rounded-[16px] bg-qr-bg p-5 text-qr-fg text-sm">
          The QR code couldn't be drawn here. Copy the invite link instead.
        </p>
      )}
      <div className="flex flex-col gap-1">
        <p className="m-0 font-semibold">{clubName}</p>
        <p className="m-0 text-fg2 text-sm">{detail}</p>
        <p className="m-0 text-fg2 text-xs [overflow-wrap:anywhere]">{link}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" disabled={!qr} onClick={() => void download()}>
          Download QR image
        </Button>
        {canShare ? (
          <Button disabled={!qr} onClick={() => void share()}>
            Share
          </Button>
        ) : null}
      </div>
      <p className="m-0 text-fg2 text-sm">
        Scanning opens the public session page. Use the image in a Facebook post or print it.
      </p>
    </div>
  )
}
