import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
export type AccountLinkStatusProps = { variant: 'reset-sent' | 'reset-invalid'; email?: string; onBackToSignIn?: () => void; onRequestAnother?: () => void }
/** Only reset outcomes are connected here; registration outcomes belong to the claim screens. */
export function AccountLinkStatus({ variant, email, onBackToSignIn, onRequestAnother }: AccountLinkStatusProps) {
  return variant === 'reset-sent' ? <AuthCard showBrand={false} title="Check your email">
    <Notice tone="success">If an account uses <b>{email}</b>, we've sent it a link to set a new password.</Notice>
    <p className="text-[13px] text-fg2">It can take a few minutes. Check spam too. Your club can't reset your password for you.</p>
    <p className="text-xs text-fg2">Prototype only: no email is sent.</p>
    <Button variant="ghost" block onClick={onBackToSignIn}>Back to sign in</Button>
  </AuthCard> : <AuthCard showBrand={false} title="This link can't be used">
    <Notice tone="error">This reset link has expired or was already used.</Notice>
    <Button variant="primary" block onClick={onRequestAnother}>Request another reset</Button>
  </AuthCard>
}
