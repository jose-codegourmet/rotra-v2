import { decodeHeif } from './heif'

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const image = await decodeHeif(new Uint8Array(event.data))
    self.postMessage(image)
  } catch (cause) {
    self.postMessage({
      error: cause instanceof Error ? cause.message : 'That HEIC/HEIF photo could not be decoded.',
    })
  }
}
