import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'

export type LicenseOperationNoticeProps = {
  /** Activate or Renew, as the sheet was opened */
  verb: 'Activate' | 'Renew'
  clubName: string
  /** Looks up whether the activation or renewal was saved before anything is tried again */
  onCheck: () => void
  /** Looking it up: "Checking…" and the button cannot be pressed */
  isChecking?: boolean
}

/**
 * The License sheet after a save got no reply (rotra-admin.html SHEETS.license timeout step): the term
 * may already be saved, so the only way on is Check status. Never offers to save again.
 */
export function LicenseOperationNotice({
  verb,
  clubName,
  onCheck,
  isChecking = false,
}: LicenseOperationNoticeProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <Notice tone="warn" title="No reply from ROTRA.">
        The {verb === 'Renew' ? 'renewal' : 'activation'} may already be saved. Check its status
        before trying again, so {clubName} isn't given two periods.
      </Notice>
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button variant="primary" disabled={isChecking} onClick={onCheck}>
          {isChecking ? 'Checking…' : 'Check status'}
        </Button>
      </div>
    </div>
  )
}
