'use client'
import { MockError } from '@rotra/data/mock/errors'
import {
  useGuestRegistration,
  useGuestRegistrationClub,
} from '@rotra/data/player-account/useGuestRegistration'
import { consumeSessionReturn, rememberSessionReturn } from '@rotra/data/public-session/context'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { ClaimForm } from '@rotra/ui/claim-form'
import { ErrorState } from '@rotra/ui/error-state'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'

export function GuestRegistration({ clubId, returnTo }: { clubId: string; returnTo?: string }) {
  useEffect(() => {
    rememberSessionReturn(returnTo)
  }, [returnTo])
  const club = useGuestRegistrationClub(clubId)
  const registration = useGuestRegistration(clubId)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const result = registration.data
  if (result?.status === 'registered')
    return (
      <AccountLinkStatus
        variant="claim-done"
        standalone
        firstName={result.firstName}
        rtrId={result.rtrId}
        onOpenProfile={() => router.push(`/players/${result.playerId}`)}
      />
    )
  if (club.isError)
    return (
      <LinkPage title="Couldn't open this registration invitation.">
        <ErrorState
          title={club.error.message}
          retryLabel="Retry"
          retrying={club.isFetching}
          onRetry={() => void club.refetch()}
        />
      </LinkPage>
    )
  if (!club.data)
    return (
      <LinkPage title="Opening registration">
        <Skeleton className="h-40" />
      </LinkPage>
    )
  const error = registration.error
  return (
    <ClaimForm
      standalone
      clubName={club.data.clubName}
      maskedPhone=""
      isPending={registration.isPending}
      accountMatch={result?.status === 'account-match'}
      onDismissMatch={() => registration.reset()}
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
      onSubmit={({ confirmPassword: _confirm, ...values }) =>
        registration.mutate(values, {
          onSuccess: (response) => {
            if (response.status === 'registered') {
              dispatch(setAccount(response.session.account))
              toast('Registration complete')
              const back = consumeSessionReturn(returnTo)
              if (back) {
                window.location.assign(back)
                return
              }
            }
            window.scrollTo(0, 0)
          },
          onError: (failure) => toast.error(failure.message),
        })
      }
    />
  )
}
