export type LicenseReferenceCellProps = {
  /** The generated `LIC-####` number (ClubLicenseTerm.paymentReference); "—" when empty */
  licenseNumber: string
  /** The owner-typed note (ClubLicenseTerm.notes); a second muted line when there is one */
  note?: string | null
}

/**
 * A-CLUB-DETAIL › License › Payment history, Reference column: the generated LIC number in mono and,
 * under it, the owner-typed note when there is one (rotra-admin.html viewClub terms table).
 */
export function LicenseReferenceCell({ licenseNumber, note }: LicenseReferenceCellProps) {
  const text = note?.trim()
  return (
    <span className="text-[13px]">
      <span className="font-mono">{licenseNumber || '—'}</span>
      {text ? (
        <>
          <br />
          <span className="text-fg2 [overflow-wrap:anywhere]">{text}</span>
        </>
      ) : null}
    </span>
  )
}
