import { deriveSavedPlayerStats } from '../club-player/savedPlayerStats.rules'
import { DEMO_CLUB_ID } from './clubs'
import { clubPlayers } from './players'

/** Storybook uses the same roster and derivation as the running app. */
export const savedPlayerStats = deriveSavedPlayerStats(clubPlayers, DEMO_CLUB_ID, Date.now())
export const zeroSavedPlayerStats = deriveSavedPlayerStats([], DEMO_CLUB_ID, Date.now())
