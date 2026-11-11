import { licensePayments } from '@rotra/data/fixtures/licensePayments'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LicenseReferenceCell } from './LicenseReferenceCell'

const term = licensePayments[0]

const meta = {
  title: 'Admin/LicenseReferenceCell',
  component: LicenseReferenceCell,
  args: { licenseNumber: term?.paymentReference ?? '', note: term?.notes },
} satisfies Meta<typeof LicenseReferenceCell>

export default meta
type Story = StoryObj<typeof meta>

/** A row without a note: the LIC number alone. */
export const WithoutNote: Story = { args: { note: null } }
/** A row with a note: the LIC number, then the typed note in muted text. */
export const WithNote: Story = { args: { note: 'GCash transfer 8812' } }
export const NoNumber: Story = { args: { licenseNumber: '', note: null } }
export const WithNoteLight: Story = { ...WithNote, globals: { theme: 'light' } }
export const WithoutNoteLight: Story = { ...WithoutNote, globals: { theme: 'light' } }
export const WithNotePhone: Story = { ...WithNote, globals: { viewport: { value: 'phone' } } }
export const WithNoteDesktop: Story = { ...WithNote, globals: { viewport: { value: 'desktop' } } }
