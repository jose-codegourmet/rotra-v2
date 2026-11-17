import type { Meta, StoryObj } from '@storybook/react-vite'
import { LegalDocument } from './LegalDocument'

// A short sample in the shape of the real pages; the full copy lives in apps/player next to the routes.
const meta = {
  title: 'Player/LegalDocument',
  component: LegalDocument,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Privacy Policy',
    effective: 'Effective November 17, 2026',
    sections: [
      {
        heading: 'Who we are',
        blocks: [
          {
            kind: 'paragraph',
            text: 'ROTRA is a badminton session app. Clubs use it to run their club nights: the Queue, the courts, the games and the results. Players use it to see their profile, their games and their rank.',
          },
        ],
      },
      {
        heading: 'What we collect',
        blocks: [
          { kind: 'paragraph', text: 'We collect only what the app needs to work:' },
          {
            kind: 'list',
            items: [
              'From Google sign-in: your Google email address, your name and your profile picture. Nothing else.',
              'Your play: the Queue Sessions you join, the games you play, their scores and results.',
            ],
          },
        ],
      },
      {
        heading: 'Contact',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Questions about this policy or your information: support@rotra.club.',
          },
        ],
      },
    ],
  },
} satisfies Meta<typeof LegalDocument>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Light: Story = { globals: { theme: 'light' } }

export const Terms: Story = {
  args: {
    title: 'Terms of Service',
    sections: [
      {
        heading: 'Governing law',
        blocks: [
          {
            kind: 'paragraph',
            text: 'These terms are governed by the laws of the Republic of the Philippines. If there is a problem, please email us first so we can try to settle it together.',
          },
        ],
      },
    ],
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
