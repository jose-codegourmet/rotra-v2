import type { ComponentMeta } from '@rotra/ui/meta'

export const replayCardMeta = {
  name: 'ReplayCard',
  description:
    'The session record\'s replay: every court as it looked at one moment of the night (busy courts drawn with their players and "#N · M min", free courts greyed), a play/pause button, the current time, a timeline slider from the first match start to the last match end, the end time, and a summary line.',
  usage: [
    'Use at the top of the How the night ran tab of a completed Queue Session record (Q-HISTORY). Not for live sessions: the console has CourtCard.',
    "The component never runs the timer. The container owns `value`, advances it while `playing`, and reshapes `courts` and `summary` for each moment (Q08.6). onSeek reports the slider's time in ms on a one-minute step.",
    'The slider is a native range input: keyboard operable, named "Replay time", with the formatted time as its value text. Tapping a player on a court calls onSelectPlayer.',
    'Under reduced motion the court tiles switch state without a transition.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'Q-HISTORY › replayCard(), replayCourts(), replaySummary() (.replay, .rp-courts, .rp-court, .rp-bar, .rp-range)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  related: [
    'MatchRecordCard',
    'CourtDrawing',
    'CourtCard',
    'Chip',
    'IconButton',
    'SessionRecordHeader',
  ],
} satisfies ComponentMeta
