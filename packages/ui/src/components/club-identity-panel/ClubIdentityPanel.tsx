'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Field } from '@rotra/ui/field'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { type ChangeEvent, useId, useState } from 'react'

export const CLUB_NAME_MAX = 60
const LOGO_MAX_BYTES = 5_000_000
const LOGO_SIDE = 256

export type ClubIdentityPanelProps = {
  clubName: string
  initials: string
  logoUrl?: string
  /** A centre-cropped 256 px square PNG as a data URL */
  onLogoChange: (dataUrl: string) => void
  onLogoRemove: () => void
  /** "Choose an image file", "Choose an image under 5 MB" or "That image could not be read" (toast it) */
  onError: (message: string) => void
  foundingAddress: string
  /** e.g. "PH-CEB" */
  cityCode: string
  /** Name-change requests need internet */
  offline?: boolean
  /** A name change waiting for the platform owner */
  pendingRequest?: { name: string; sentAt: string }
  onRequestNameChange: (name: string) => void
  onCancelRequest: () => void
  /** The request is being sent */
  isPending?: boolean
}

/** Reads an image file and centre-crops it to a square PNG, as the prototype's loadLogo() does. */
function cropToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = LOGO_SIDE
      canvas.height = LOGO_SIDE
      const side = Math.min(img.width, img.height)
      canvas
        .getContext('2d')
        ?.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          LOGO_SIDE,
          LOGO_SIDE,
        )
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unreadable'))
    }
    img.src = url
  })
}

const sentLabel = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}`
}

/** Club settings › Club identity: logo, club name (changes need owner approval), and the fixed facts. */
export function ClubIdentityPanel({
  clubName,
  initials,
  logoUrl,
  onLogoChange,
  onLogoRemove,
  onError,
  foundingAddress,
  cityCode,
  offline,
  pendingRequest,
  onRequestNameChange,
  onCancelRequest,
  isPending,
}: ClubIdentityPanelProps) {
  const fileId = useId()
  const [draft, setDraft] = useState(clubName)
  const [error, setError] = useState<string>()
  const unchanged = draft.trim() === clubName

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return onError('Choose an image file')
    if (file.size > LOGO_MAX_BYTES) return onError('Choose an image under 5 MB')
    try {
      onLogoChange(await cropToSquare(file))
    } catch {
      onError('That image could not be read')
    }
  }

  const request = () => {
    const name = draft.trim()
    if (!name) return setError('Enter the club name.')
    setError(undefined)
    onRequestNameChange(name)
  }

  return (
    <Card asChild>
      <section aria-labelledby={`${fileId}-h`} className="flex flex-col gap-3">
        <h2 id={`${fileId}-h`}>Club identity</h2>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <Avatar
              name={`${clubName} logo`}
              src={logoUrl}
              size={88}
              shape="square"
              className="bg-surface"
            />
          ) : (
            <Avatar name={clubName} initials={initials} size={88} shape="square" tone="accent" />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <b>Club logo</b>
            <p className="m-0 text-[13px] text-fg2">
              Shown on the dashboard, the public session page and result images. A square image
              works best.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <label htmlFor={fileId}>{logoUrl ? 'Replace logo' : 'Upload logo'}</label>
              </Button>
              <input
                id={fileId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFile}
              />
              {logoUrl ? (
                <Button size="sm" variant="ghost" onClick={onLogoRemove}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        {pendingRequest ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg2">Club name</span>
            <b>{clubName}</b>
            <Notice tone="warn" title={`Name change requested: “${pendingRequest.name}”`}>
              · sent {sentLabel(pendingRequest.sentAt)}. The ROTRA platform owner reviews it in
              Admin. Your club keeps its current name everywhere until it's approved.
            </Notice>
            <div>
              <Button size="sm" onClick={onCancelRequest} loading={isPending}>
                Cancel request
              </Button>
            </div>
          </div>
        ) : (
          <Field
            label="Club name"
            error={error}
            hint={
              error
                ? undefined
                : offline
                  ? 'Sending a request needs an internet connection.'
                  : 'Name changes need approval from the ROTRA platform owner. Nothing changes until they approve it.'
            }
          >
            <div className="flex items-center gap-2 max-[640px]:flex-col max-[640px]:items-stretch">
              <TextInput
                value={draft}
                maxLength={CLUB_NAME_MAX}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button
                className="whitespace-nowrap max-[640px]:w-full"
                disabled={offline || unchanged}
                loading={isPending}
                onClick={request}
              >
                Request change
              </Button>
            </div>
          </Field>
        )}
        <KeyValueList
          items={[
            { label: 'Founding address', value: foundingAddress },
            {
              label: 'City code',
              value: (
                <>
                  <span className="font-mono">{cityCode}</span> · used in new players' RTR IDs
                </>
              ),
            },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          The founding address and city code are fixed. Playing at a different venue doesn't change
          them.
        </p>
      </section>
    </Card>
  )
}
