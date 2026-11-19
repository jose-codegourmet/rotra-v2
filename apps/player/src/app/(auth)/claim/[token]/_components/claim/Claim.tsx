'use client'
import { useMyAccountVerification } from '@rotra/data/account-verification/useMyAccountVerification'
import type { GoogleIdentity } from '@rotra/data/google-sign-in/types'
import { useCompleteClaimWithGoogle } from '@rotra/data/google-sign-in/useCompleteClaimWithGoogle'
import { MockError } from '@rotra/data/mock/errors'
import { maskEmail } from '@rotra/data/player-account/rules'
import { useCheckClaimStatus } from '@rotra/data/player-account/useCheckClaimStatus'
import { useClaimLink } from '@rotra/data/player-account/useClaimLink'
import { useCompleteClaim } from '@rotra/data/player-account/useCompleteClaim'
import { consumeSessionReturn, rememberSessionReturn } from '@rotra/data/public-session/context'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { Card } from '@rotra/ui/card'
import { ClaimForm } from '@rotra/ui/claim-form'
import { ClaimIdentityCheck } from '@rotra/ui/claim-identity-check'
import { ErrorState } from '@rotra/ui/error-state'
import { GoogleChooseCard } from '@rotra/ui/google-choose-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGooglePicker, useGoogleReturn } from '@/app/_components/google-sign-in/useGooglePicker'
import { useNoGoogleSheet } from '@/app/_components/google-sign-in/useNoGoogleSheet'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'

type Step = 'check' | 'wrong' | 'method' | 'form'
type Done = { playerId: string; firstName: string; rtrId: string; googleEmail?: string }

export function Claim({ token, returnTo }: { token: string; returnTo?: string }) {
  useEffect(() => {
    rememberSessionReturn(returnTo)
  }, [returnTo])
  const link = useClaimLink(token)
  const complete = useCompleteClaim()
  // Google mode (player_google_sign_in flag): the method step and the form with the Google row.
  const googleOn = usePlayerGoogleSignInEnabled()
  const completeGoogle = useCompleteClaimWithGoogle()
  const [google, setGoogle] = useState<GoogleIdentity | null>(null)
  const [methodError, setMethodError] = useState('')
  const check = useCheckClaimStatus()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [step, setStep] = useState<Step>('check')
  const [done, setDone] = useState<Done | null>(null)
  const verification = useMyAccountVerification(done?.googleEmail ? done.playerId : null)
  const pickGoogle = (identity: GoogleIdentity) => {
    setGoogle(identity)
    setMethodError('')
    setStep('form')
    window.scrollTo(0, 0)
  }
  // Real mode comes back to this page from Google: the form opens with the account it verified.
  useGoogleReturn('claim', pickGoogle)

  if (done)
    return (
      <AccountLinkStatus
        variant="claim-done"
        firstName={done.firstName}
        rtrId={done.rtrId}
        googleEmail={done.googleEmail}
        verificationComplete={verification.data?.completedSteps === 3}
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
              const back = consumeSessionReturn(returnTo)
              if (back) window.location.assign(back)
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
        maskedEmail={maskEmail(data.preset.email)}
        onReject={() => setStep('wrong')}
        onConfirm={() => {
          setStep(googleOn ? 'method' : 'form')
          window.scrollTo(0, 0)
        }}
      />
    )
  if (step === 'method' && googleOn)
    return <GoogleMethodStep clubName={data.clubName} error={methodError} onPick={pickGoogle} />
  if (googleOn && google)
    return (
      <ClaimForm
        clubName={data.clubName}
        maskedPhone={data.preview.maskedPhone}
        defaultValues={data.preset}
        google={{
          ...google,
          onChange: () => {
            setGoogle(null)
            completeGoogle.reset()
            setStep('method')
            window.scrollTo(0, 0)
          },
        }}
        isPending={completeGoogle.isPending}
        serverError={
          completeGoogle.error
            ? {
                message: completeGoogle.error.message,
                field:
                  completeGoogle.error instanceof MockError &&
                  completeGoogle.error.fieldErrors?.phone
                    ? 'phone'
                    : undefined,
              }
            : undefined
        }
        onSubmit={({
          confirmPassword: _confirm,
          email: _email,
          password: _password,
          cityCode: _city,
          ...values
        }) =>
          completeGoogle.mutate(
            { token, google, values },
            {
              onSuccess: (result) => {
                if (result.outcome === 'taken') {
                  setGoogle(null)
                  setMethodError(
                    `${result.email} is already on another ROTRA account. Pick another Google account or set a password.`,
                  )
                  setStep('method')
                  window.scrollTo(0, 0)
                  return
                }
                dispatch(setAccount(result.session.account))
                setDone({ ...result, googleEmail: google.email })
                const back = consumeSessionReturn(returnTo)
                if (back) window.location.assign(back)
                window.scrollTo(0, 0)
                toast('Registration complete')
              },
              onError: (failure) => toast.error(failure.message),
            },
          )
        }
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
              field:
                error instanceof MockError && error.fieldErrors?.email
                  ? 'email'
                  : error instanceof MockError && error.fieldErrors?.phone
                    ? 'phone'
                    : undefined,
            }
          : undefined
      }
      onSubmit={({ confirmPassword: _confirm, cityCode: _city, ...values }) =>
        complete.mutate(
          { token, values },
          {
            onSuccess: (result) => {
              dispatch(setAccount(result.session.account))
              setDone(result)
              const back = consumeSessionReturn(returnTo)
              if (back) window.location.assign(back)
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

/** P-CLAIM method step, Google only: "Connect your Google account". */
function GoogleMethodStep({
  clubName,
  error,
  onPick,
}: {
  clubName: string
  error: string
  onPick: (identity: GoogleIdentity) => void
}) {
  const picker = useGooglePicker({ key: 'claim', intent: 'claim' })
  const noGoogle = useNoGoogleSheet()
  return (
    <>
      <LinkPage
        label={`Registration link from ${clubName}`}
        title="Connect your Google account"
        description="ROTRA players sign in with Google. Connect yours to finish registering."
      >
        <GoogleChooseCard
          error={error || undefined}
          hint="Your Google email becomes your ROTRA email and is already confirmed."
          onGoogle={() => picker.start(onPick)}
          onNoGoogle={noGoogle.open}
        />
      </LinkPage>
      {picker.sheet}
      {noGoogle.sheet}
    </>
  )
}
