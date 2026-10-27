import {
  buildPostValues,
  DEFAULT_POST_TEMPLATE,
  fillPostTemplate,
  type PostInput,
} from '../club/club.rules'
import { clubs } from './clubs'
import { createQueueFixtures } from './queueSessions'

const club = clubs[0]
const { sessions, courts, roster } = createQueueFixtures()
const session = sessions[0]
if (!club || !session) throw new Error('Missing club or session fixtures.')

const input: PostInput = {
  club: { name: club.name, description: club.description, courtRules: club.courtRules },
  session,
  courts: courts.filter((c) => c.sessionId === session.id),
  roster: roster.map((r) => ({ name: r.nameSnapshot, nickname: r.nicknameSnapshot })),
  waitlist: [],
  openSlots: 24 - roster.length,
  mode: session.sessionMode,
  minimum: session.minimumGames,
}

/** A short club-written template with its own wording. */
export const CUSTOM_POST_TEMPLATE = `{{ title }} — {{ when }}
Where: {{ where }}
Who's in ({{ player_count }}):
{{ players }}
Pay {{ fee_per_head }} to the Queue Master.`

/** Story text for the Facebook post editor, preview and copy dialogs (Sunday Night Queue). */
export const facebookPostFixtures = {
  sessionTitle: session.title,
  sessionStartsAt: session.scheduledStartAt,
  playerCount: roster.length,
  /** The default template filled in from the seeded session */
  filledDefault: fillPostTemplate(DEFAULT_POST_TEMPLATE, buildPostValues(input)),
  /** A club-written template, filled in */
  filledCustom: fillPostTemplate(CUSTOM_POST_TEMPLATE, buildPostValues(input)),
  /** An unknown key stays as typed */
  filledUnknownKey: fillPostTemplate(
    'See you at {{ where }} — bring {{ snacks }}!',
    buildPostValues(input),
  ),
  /** Nobody on the roster yet */
  filledEmptyRoster: fillPostTemplate(
    DEFAULT_POST_TEMPLATE,
    buildPostValues({ ...input, roster: [], openSlots: 24 }),
  ),
}
