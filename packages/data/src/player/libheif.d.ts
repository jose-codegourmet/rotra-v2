declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  type HeifImage = {
    get_width(): number
    get_height(): number
    display(
      target: { data: Uint8ClampedArray; width: number; height: number },
      callback: (result: unknown) => void,
    ): void
    free(): void
  }
  export default function initialize(): Promise<{
    HeifDecoder: new () => { decode(buffer: Uint8Array): HeifImage[] }
  }>
}
