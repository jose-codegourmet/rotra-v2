'use client'
import { useResetLink } from '@rotra/data/player-account/useResetLink'
import { useResetPassword } from '@rotra/data/player-account/useResetPassword'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { AuthCard } from '@rotra/ui/auth-card'
import { ErrorState } from '@rotra/ui/error-state'
import { ResetPasswordForm } from '@rotra/ui/reset-password-form'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'
export function ResetPassword({ token }: { token: string }) {
  const link = useResetLink(token), mutation = useResetPassword(), router = useRouter(), { offline } = useAppSelector(selectDev)
  if (link.isError && !link.data) return <AuthCard showBrand={false} title="Couldn't load the reset link."><ErrorState title="Check your connection, then try again." retryLabel="Retry" onRetry={() => void link.refetch()} retrying={link.isFetching} /></AuthCard>
  if (!link.data) return <AuthCard showBrand={false} title={<Skeleton className="h-7" />}><Skeleton className="h-32" /></AuthCard>
  if (link.data.status !== 'valid' && !mutation.isPending && !mutation.isSuccess) return <AccountLinkStatus variant="reset-invalid" onRequestAnother={() => router.push('/forgot-password')} />
  return <ResetPasswordForm offline={offline} isPending={mutation.isPending || mutation.isSuccess} serverError={mutation.error?.message}
    onSubmit={({ password }) => mutation.mutate({ token, password }, { onSuccess: () => { router.replace('/login?password=saved'); toast('Password saved') }, onError: (error) => toast.error(error.message) })} />
}
