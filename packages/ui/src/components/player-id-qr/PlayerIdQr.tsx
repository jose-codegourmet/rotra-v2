import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Icon } from '@rotra/ui/icon'
import { drawQr, type QrDrawing } from './PlayerIdQr.helpers'

export type PlayerIdQrProps = {
  /** The permanent RTR ID; the QR holds exactly this text and nothing else */
  rtrId: string
  /** Element id on the big ID, for the copy fallback that selects it */
  id?: string
  onCopy: () => void
  /** Encoder override; stories pass one that fails to show the fallback */
  draw?: (text: string) => QrDrawing | null
}

/** P-ID-QR's card: a large scannable QR of the RTR ID, the ID in big mono type and Copy ID. */
export function PlayerIdQr({ rtrId, id, onCopy, draw = drawQr }: PlayerIdQrProps) {
  const qr = draw(rtrId)
  return (
    <Card asChild>
      <section className="flex flex-col items-stretch gap-4">
        {qr ? (
          <div
            role="img"
            aria-label={`QR code for player ID ${rtrId}`}
            className="aspect-square w-[min(260px,100%)] self-center rounded-[16px] bg-qr-bg p-3.5 text-qr-fg"
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
          <div className="grid aspect-square w-[min(260px,100%)] place-items-center self-center rounded-[16px] bg-qr-bg p-5 text-center text-qr-fg text-sm">
            The QR code couldn't be drawn here. Read the ID out or let the club type it.
          </div>
        )}
        <p
          id={id}
          className="m-0 text-center font-mono font-semibold text-[clamp(17px,4.6vw,24px)] tracking-[0.6px] [overflow-wrap:anywhere]"
        >
          {rtrId}
        </p>
        <div className="flex justify-center">
          <Button size="sm" onClick={onCopy}>
            <Icon name="copy" /> Copy ID
          </Button>
        </div>
        <p className="m-0 text-center text-fg2 text-sm">
          The code holds only this ID. It doesn't contain your phone, email or sign-in details, and
          scanning it doesn't sign anyone in or reserve a slot.
        </p>
      </section>
    </Card>
  )
}
