interface Window {
  mountPrototypeRouter: (adapter: {
    read: () => string
    apply: (url: URL) => boolean
    render: () => void
    dirty?: () => boolean
    home: string
  }) => { sync: () => void; readonly unavailable: boolean }
}
