'use client'
import { MockError } from '@rotra/data/mock/errors'
import { useCheckClaimStatus } from '@rotra/data/player-account/useCheckClaimStatus'
import { useClaimLink } from '@rotra/data/player-account/useClaimLink'
import { useCompleteClaim } from '@rotra/data/player-account/useCompleteClaim'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { Card } from '@rotra/ui/card'
import { ClaimForm } from '@rotra/ui/claim-form'
import { ClaimIdentityCheck } from '@rotra/ui/claim-identity-check'
import { ErrorState } from '@rotra/ui/error-state'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'

type Step = 'check' | 'wrong' | 'form'
type Done = { playerId: string; firstName: string; rtrId: string }

export function Claim({ token }: { token: string }) {
  const link = useClaimLink(token)
  const complete = useCompleteClaim()
  const check = useCheckClaimStatus()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [step, setStep] = useState<Step>('check')
  const [done, setDone] = useState<Done | null>(null)

  if (done)
    return (
      <AccountLinkStatus
        variant="claim-done"
        firstName={done.firstName}
        rtrId={done.rtrId}
        onOpenProfile={() => router.push(`/players/${done.playerId}`)}
      />
    )
  if (link.isError && !link.data)
    return (
      <LinkPage title="Couldn't open this registration link.">
        <ErrorState
          title={link.error.message}
          retryLabel="Retry"
          onRetry={() => void link.refetch()}
          retrying={link.isFetching}
        />
      </LinkPage>
    )
  if (link.isPending)
    return (
      <LinkPage title={<Skeleton className="h-8 w-2/3" />}>
        <Card aria-busy="true" aria-label="Checking the registration link">
          <Skeleton className="h-16" />
          <Skeleton className="mt-4 h-10" />
        </Card>
      </LinkPage>
    )
  const data = link.data
  // An unknown token reads as expired, so the page never reveals whether a profile exists.
  if (!data || data.status === 'expired')
    return (
      <AccountLinkStatus
        variant="claim-expired"
        clubName={data?.clubName}
        onSignIn={() => router.push('/login')}
      />
    )
  if (data.status === 'claimed' && !complete.isPending)
    return (
      <AccountLinkStatus
        variant="claim-claimed"
        clubName={data.clubName}
        onSignIn={() => router.push('/login')}
        onResetByEmail={() => router.push('/forgot-password')}
      />
    )
  if (data.status === 'processing')
    return (
      <AccountLinkStatus
        variant="claim-processing"
        clubName={data.clubName}
        isPending={check.isPending}
        onCheckAgain={() =>
          check.mutate(token, {
            onSuccess: (result) => {
              if (result.status === 'processing') {
                toast('Still setting up. Check again in a moment.')
                return
              }
              dispatch(setAccount(result.session.account))
              setDone(result)
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    )
  if (step === 'wrong')
    return (
      <AccountLinkStatus
        variant="claim-wrong"
        clubName={data.clubName}
        onThisIsMe={() => setStep('check')}
      />
    )
  if (step === 'check')
    return (
      <ClaimIdentityCheck
        clubName={data.clubName}
        preview={data.preview}
        onReject={() => setStep('wrong')}
        onConfirm={() => {
          setStep('form')
          window.scrollTo(0, 0)
        }}
      />
    )
  const error = complete.error
  return (
    <ClaimForm
      clubName={data.clubName}
      maskedPhone={data.preview.maskedPhone}
      defaultValues={data.preset}
      isPending={complete.isPending}
      serverError={
        error
          ? {
              message: error.message,
              field: error instanceof MockError && error.fieldErrors?.email ? 'email' : undefined,
            }
          : undefined
      }
      onSubmit={({ confirmPassword: _confirm, ...values }) =>
        complete.mutate(
          { token, values },
          {
            onSuccess: (result) => {
              dispatch(setAccount(result.session.account))
              setDone(result)
              window.scrollTo(0, 0)
              toast('Registration complete')
            },
            onError: (failure) => toast.error(failure.message),
          },
        )
      }
    />
  )
}
