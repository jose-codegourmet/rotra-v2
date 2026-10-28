import { toast } from '@rotra/ui/toaster'

/** Copies an RTR ID; where the clipboard is blocked, selects the ID element so the player can copy it. */
export async function copyPlayerId(rtrId: string, elementId: string) {
  try {
    await navigator.clipboard.writeText(rtrId)
    toast('Player ID copied')
  } catch {
    const element = document.getElementById(elementId)
    if (element) {
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      toast('ID selected. Copy it from your device menu.')
    }
  }
}
