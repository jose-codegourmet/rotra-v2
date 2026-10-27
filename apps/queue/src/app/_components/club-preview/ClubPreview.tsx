'use client'

import { useClub } from '@rotra/data/club'
import { MockError } from '@rotra/data/mock/errors'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { Spinner } from '@rotra/ui/spinner'

/** Foundation placeholder demonstrating the domain hook; product screens arrive in later epics. */
export function ClubPreview({ clubId }: { clubId: string }) {
  const club = useClub(clubId)
  if (club.isPending) {
    return (
      <Notice title="Loading club…">
        <Spinner label="Loading club" />
      </Notice>
    )
  }
  if (club.isError) {
    return (
      <ErrorState
        title="Couldn't load the club."
        kind={
          club.error instanceof MockError && club.error.kind === 'permission'
            ? 'permission'
            : 'retryable'
        }
        onRetry={() => {
          void club.refetch()
        }}
        retrying={club.isFetching}
      />
    )
  }
  return (
    <Card>
      <KeyValueList
        items={[
          { label: 'Club', value: club.data.name },
          { label: 'Founding location', value: club.data.foundingAddress },
        ]}
      />
    </Card>
  )
}
