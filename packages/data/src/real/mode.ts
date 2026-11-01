// @rotra/data ships without Node types; Next inlines NEXT_PUBLIC_* values at build time.
declare const process: { env: { NEXT_PUBLIC_ROTRA_DATA_MODE?: string } }

/**
 * `real` sends the wired journey (F07.34) to the app's Route Handlers; anything else uses the mock
 * store. Mirrors the server's `ROTRA_DATA_MODE`; set both. Storybook never sets it.
 */
export function isRealDataMode() {
  return process.env.NEXT_PUBLIC_ROTRA_DATA_MODE === 'real'
}

/** Shown when a screen reaches a domain that is not connected to saved data yet. */
export const NOT_CONNECTED_MESSAGE = "This part of ROTRA isn't connected to saved data yet."
