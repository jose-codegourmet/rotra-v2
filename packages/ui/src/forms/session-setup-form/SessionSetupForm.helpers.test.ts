import { describe, expect, it } from 'vitest'
import { isEnterSubmitTarget, setupSubmitAction } from './SessionSetupForm.helpers'

describe('setupSubmitAction', () => {
  it('acts as Next on pages 1 and 2 and saves only on page 3', () => {
    expect(setupSubmitAction(0, 2)).toBe('next')
    expect(setupSubmitAction(1, 2)).toBe('next')
    expect(setupSubmitAction(2, 2)).toBe('save')
  })
})

describe('isEnterSubmitTarget', () => {
  it('treats text-like inputs as Enter targets', () => {
    expect(isEnterSubmitTarget({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(isEnterSubmitTarget({ tagName: 'INPUT', type: 'number' })).toBe(true)
    expect(isEnterSubmitTarget({ tagName: 'INPUT' })).toBe(true)
  })

  it('ignores buttons, toggles, text areas and empty targets', () => {
    expect(isEnterSubmitTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe(false)
    expect(isEnterSubmitTarget({ tagName: 'BUTTON', type: 'button' })).toBe(false)
    expect(isEnterSubmitTarget({ tagName: 'TEXTAREA' })).toBe(false)
    expect(isEnterSubmitTarget(null)).toBe(false)
  })
})
