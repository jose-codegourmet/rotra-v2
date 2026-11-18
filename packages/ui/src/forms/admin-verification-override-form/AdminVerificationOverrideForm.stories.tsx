import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  AdminVerificationOverrideForm,
  type AdminVerificationOverrideFormProps,
} from './AdminVerificationOverrideForm'

const OFFLINE_ERROR = "You're offline, so nothing was saved. Try again once you're connected."

function Demo(props: AdminVerificationOverrideFormProps) {
  const [open, setOpen] = useState(props.open)
  const [error, setError] = useState<string | undefined>(props.serverError)
  return (
    <>
      <Button
        onClick={() => {
          setError(props.serverError)
          setOpen(true)
        }}
      >
        {props.verifiedByAdmin ? 'Clear override' : 'Set Verified by Admin'}
      </Button>
      <AdminVerificationOverrideForm
        {...props}
        open={open}
        onOpenChange={setOpen}
        serverError={error}
        onSubmit={() => {
          if (error) {
            setError(undefined)
            return
          }
          setOpen(false)
        }}
      />
    </>
  )
}

const player = adminPlayerDetailExamples.identity.jose
const meta = {
  title: 'Admin/AdminVerificationOverrideForm',
  component: AdminVerificationOverrideForm,
  args: {
    playerName: player.fullName,
    rtrId: player.rtrId,
    completedSteps: 1,
    verifiedByAdmin: false,
    open: true,
    onOpenChange: () => {},
    onSubmit: () => {},
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof AdminVerificationOverrideForm>

export default meta
type Story = StoryObj<typeof meta>

export const SetVerifiedByAdmin: Story = {}
export const ClearToAutomatic: Story = { args: { verifiedByAdmin: true } }
export const ClearToVerified: Story = { args: { completedSteps: 3, verifiedByAdmin: true } }
export const Pending: Story = { args: { isPending: true } }
export const FailedSave: Story = { args: { serverError: 'Changes could not be saved' } }
export const Offline: Story = { args: { serverError: OFFLINE_ERROR } }

export const SetVerifiedByAdminLight: Story = { ...SetVerifiedByAdmin, globals: { theme: 'light' } }
export const ClearToAutomaticLight: Story = { ...ClearToAutomatic, globals: { theme: 'light' } }
export const ClearToVerifiedLight: Story = { ...ClearToVerified, globals: { theme: 'light' } }
export const PendingLight: Story = { ...Pending, globals: { theme: 'light' } }
export const FailedSaveLight: Story = { ...FailedSave, globals: { theme: 'light' } }
export const OfflineLight: Story = { ...Offline, globals: { theme: 'light' } }
