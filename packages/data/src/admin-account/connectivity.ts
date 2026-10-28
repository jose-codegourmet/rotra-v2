import { getMockDevState } from '../mock/bridge'

export function isAdminOffline() {
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || (process.env.NODE_ENV !== 'production' && getMockDevState().offline)
}
