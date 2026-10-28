import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'

export type AccessDeniedCardProps = {
  accountDescription: string
  onSignOut: () => void
  isSigningOut?: boolean
}

export function AccessDeniedCard({ accountDescription, onSignOut, isSigningOut = false }: AccessDeniedCardProps) {
  return (
    <AuthCard showBrand={false} badge={<Chip tone="error">Access denied</Chip>} title="This account can't open Admin" description={`You're signed in with ${accountDescription}. Admin is only for the ROTRA platform owner, so no club or player information is shown here.`}>
      <p className="text-[13px] text-fg2">Clubs sign in to the Queue app and players to Player Information.</p>
      <Button onClick={onSignOut} disabled={isSigningOut}>{isSigningOut ? 'Signing out…' : 'Sign out'}</Button>
    </AuthCard>
  )
}
