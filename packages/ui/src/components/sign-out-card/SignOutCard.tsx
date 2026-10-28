import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'

export type SignOutCardProps = { onSignOut: () => void; isPending?: boolean }

/** The 'Sign out' card at the end of P-PHONE-PRIVACY. */
export function SignOutCard({ onSignOut, isPending }: SignOutCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3>Sign out</h3>
          <p className="m-0 text-fg2 text-sm">Your public profile stays visible.</p>
        </div>
        <Button size="sm" variant="danger" onClick={onSignOut} disabled={isPending}>
          Sign out
        </Button>
      </section>
    </Card>
  )
}
