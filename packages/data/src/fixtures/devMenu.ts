import { DEFAULT_DEV_STATE } from '../mock/bridge'
export const devMenuFixtures = {
  default: { ...DEFAULT_DEV_STATE },
  offline: { ...DEFAULT_DEV_STATE, offline: true },
  expired: { ...DEFAULT_DEV_STATE, licenseExpired: true },
  saveFailure: { ...DEFAULT_DEV_STATE, nextSaveFails: true },
  conflict: { ...DEFAULT_DEV_STATE, nextSaveConflict: true },
}
