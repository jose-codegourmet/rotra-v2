import { getMockDevState } from '../mock/bridge'
import { isProductionBuild } from '../mock/env'

export function isAdminOffline() {
  return (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    (!isProductionBuild() && getMockDevState().offline)
  )
}
