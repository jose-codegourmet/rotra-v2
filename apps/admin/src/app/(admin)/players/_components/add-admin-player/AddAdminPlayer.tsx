'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { appOrigin } from '@rotra/data/app-origins'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import { AdminAddPlayerForm } from '@rotra/ui/admin-add-player-form'
import { Button } from '@rotra/ui/button'
import { CopyPlayerValue } from '@rotra/ui/copy-player-value'
import { Icon } from '@rotra/ui/icon'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
export function AddAdminPlayer({ onCreated }: { onCreated: () => void }) {
  const [copyValue, setCopyValue] = useState(''),
    [open, setOpen] = useState(false),
    { offline } = useAdminConnectivity(),
    mutations = useAdminPlayerMutations(),
    clubs = useAdminClubs()
  return (
    <>
      <CopyPlayerValue value={copyValue} onClose={() => setCopyValue('')} />
      <Button
        variant="primary"
        disabled={offline}
        title={offline ? 'Reconnect to add a player' : undefined}
        onClick={() => {
          mutations.create.reset()
          setOpen(true)
        }}
      >
        <Icon name="plus" size={16} /> Add player
      </Button>
      {open ? (
        <AdminAddPlayerForm
          open
          onClose={() => setOpen(false)}
          clubs={clubs.data?.clubs ?? []}
          places={foundingCities.map((c) => ({ ...c, code: c.code.split('-')[1] ?? '' }))}
          offline={offline}
          isPending={mutations.create.isPending}
          serverError={mutations.create.error?.message}
          onSubmit={(values) =>
            mutations.create.mutate(values, {
              onSuccess: (player) => {
                setOpen(false)
                onCreated()
                toast.success('Player added', {
                  action: {
                    label: 'Copy registration link',
                    onClick: () => {
                      mutations.link.mutate(player.id, {
                        onSuccess: (result) => {
                          const base = appOrigin('player')
                          const url = `${base}/claim/${result.token}`
                          void (async () => {
                            try {
                              await navigator.clipboard.writeText(url)
                              toast.success(
                                `Registration link copied · expires ${new Date(result.expiresAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`,
                              )
                            } catch {
                              setCopyValue(url)
                            }
                          })()
                        },
                        onError: (error) => toast.error(error.message),
                      })
                    },
                  },
                })
              },
              onError: (error) => toast.error(error.message),
            })
          }
        />
      ) : null}
    </>
  )
}
