import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectMockBridge, DEFAULT_DEV_STATE, notifyMockBridge } from '../mock/bridge'
import { getConnectivity, subscribeConnectivity } from './connectivity'

describe('Connectivity › one truth for the browser signal and "Simulate offline"', () => {
  let devOffline = false
  let disconnect = () => {}

  beforeEach(() => {
    devOffline = false
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('window', new EventTarget())
    disconnect = connectMockBridge({
      read: () => ({ ...DEFAULT_DEV_STATE, offline: devOffline }),
      consume: () => {},
    })
  })
  afterEach(() => {
    disconnect()
    vi.unstubAllGlobals()
  })

  it('is online when the browser is online and the toggle is off', () => {
    expect(getConnectivity()).toBe('online')
  })

  it('is offline when only the browser reports offline', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(getConnectivity()).toBe('offline')
  })

  it('is offline when only the dev toggle is on', () => {
    devOffline = true
    expect(getConnectivity()).toBe('offline')
  })

  it('is online on the server, where nothing reports offline', () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('navigator', undefined)
    expect(getConnectivity()).toBe('online')
  })

  it('notifies subscribers on browser events and toggle changes, then stops', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeConnectivity(listener)
    vi.stubGlobal('navigator', { onLine: false })
    window.dispatchEvent(new Event('offline'))
    expect(listener).toHaveBeenCalledTimes(1)
    vi.stubGlobal('navigator', { onLine: true })
    window.dispatchEvent(new Event('online'))
    expect(listener).toHaveBeenCalledTimes(2)
    devOffline = true
    notifyMockBridge()
    expect(listener).toHaveBeenCalledTimes(3)
    unsubscribe()
    window.dispatchEvent(new Event('offline'))
    notifyMockBridge()
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
