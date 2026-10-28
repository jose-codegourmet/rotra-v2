import type { PublishResultsFormInput } from './PublishResultsForm.schema'

/** The previously published selection, when updating a publication */
export type PreviousPublication = {
  standings: boolean
  awards: boolean
}

/**
 * The first publish starts with Standings and Awards both on; an update starts from the previous
 * selection. Include Off Day is ALWAYS off when the sheet opens, whatever was shared before
 * (the prototype's ACT.openPublish).
 */
export function publishResultsFormDefaultValues(
  previous?: PreviousPublication | null,
): PublishResultsFormInput {
  return {
    standings: previous ? previous.standings : true,
    awards: previous ? previous.awards : true,
    includeOffDay: false,
  }
}
