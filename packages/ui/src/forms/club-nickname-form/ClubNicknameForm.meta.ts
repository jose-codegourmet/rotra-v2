import type { ComponentMeta } from '@rotra/ui/meta'

export const clubNicknameFormMeta = {
  name: 'ClubNicknameForm',
  description:
    'Club nickname: a small dialog "Club nickname for NAME" with the text "What your club calls FIRSTNAME. Only you see it: on the console, the roster and Saved players.", one optional Club nickname field (up to 24 characters, the same limit as an account nickname), the hint that the session page, results and leaderboards show the account nickname (or the name on their ROTRA account), and Cancel / Save nickname.',
  usage: [
    'Open it from the Club nickname button of a registered player\'s profile (Saved players). Guests and unclaimed players never get it: their one nickname is in Edit details.',
    'Pass currentNickname to prefill and accountNickname (null when they have none) for the hint: "…show the nickname on their ROTRA account, “NICK”. Leave this empty to use that here too." or "…show the name on their ROTRA account. Leave this empty to use that here too."',
    'onSubmit receives the trimmed nickname; an empty string removes the club nickname. The container saves it and toasts "Club nickname saved · NAME", "Club nickname removed · NAME" or "No club nickname · NAME".',
    'The only error is "Use 24 characters or fewer." (NICKNAME_MAX in @rotra/schema/personal-details).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.clubNick',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-18-queue-club-nickname.md',
  ],
  variants: ['empty', 'filled', 'no account nickname', 'saved empty', 'saving', 'server error'],
  related: ['PlayerProfileSheet', 'SavedPlayerCard', 'EditPlayerDetailsForm', 'Sheet', 'Field'],
} satisfies ComponentMeta
