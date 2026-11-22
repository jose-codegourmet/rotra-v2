'use client'

import { Button } from '@rotra/ui/button'
import { CopyField } from '@rotra/ui/copy-field'
import { drawQr, type QrDrawing } from '@rotra/ui/player-id-qr/helpers'
import { Sheet } from '@rotra/ui/sheet'

export type TransferLinkSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The full transfer link, `https://…/s/<slug>?transfer=<token>` */
  link: string
  /** "Nov 9, 7:30 PM": when the session starts (the link stops working then) */
  startsLabel: string
  /** Copies the link; the caller shows “Transfer link copied” or the clipboard-failure toast */
  onCopy: () => void
  /** The system share sheet, where the device has one; omit to show Copy link instead */
  onShare?: () => void
  /** Encoder override; stories pass one that fails to show the fallback */
  draw?: (text: string) => QrDrawing | null
}

/**
 * Transfer link (#1012, the prototype's SHEETS.transferLink): the single-claim link a confirmed
 * player made for a recipient with no ROTRA account, shown once right after it is made. A QR of the
 * link, the Transfer link copy field and Share (or Copy link). The token is never stored, so a lost
 * link is cancelled on My night and made again.
 */
export function TransferLinkSheet({
  open,
  onOpenChange,
  link,
  startsLabel,
  onCopy,
  onShare,
  draw = drawQr,
}: TransferLinkSheetProps) {
  const qr = draw(link)
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer link"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {onShare ? (
            <Button variant="primary" onClick={onShare}>
              Share
            </Button>
          ) : (
            <Button variant="primary" onClick={onCopy}>
              Copy link
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[13px] text-fg2">
          Send this link to the player who&apos;ll take your slot. They sign up or log in to ROTRA,
          then claim it. Only the first person to claim it can; the Queue Master still approves, and
          you keep your slot until then.
        </p>
        {qr ? (
          <div
            role="img"
            aria-label="QR code for the transfer link"
            className="aspect-square w-[min(220px,100%)] self-center rounded-[16px] bg-qr-bg p-3.5 text-qr-fg"
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
        ) : null}
        <CopyField label="Transfer link" value={link} onCopy={onCopy} />
        <p className="m-0 text-[13px] text-fg2">
          It stops working at the start ({startsLabel}), or if the Queue Master rejects the claim or
          it is withdrawn; then make a new one. ROTRA shows this link only once: if you lose it,
          cancel it on My night and make a new one.
        </p>
      </div>
    </Sheet>
  )
}
