// @ts-check
/**
 * URLs contain navigation only. Browser Back never restores a data snapshot or
 * reverses a completed prototype action.
 * @param {{ read: () => string, apply: (url: URL) => boolean, render: () => void,
 * dirty?: () => boolean, home: string }} adapter
 */
window.mountPrototypeRouter = (adapter) => {
  let applying = false
  let unavailable = false
  let current = location.pathname + location.search
  let index = history.state?.prototypeIndex ?? 0
  let reverting = false
  const previousState = () => ({ prototypeIndex: index })
  history.replaceState(previousState(), '', current)
  history.scrollRestoration = 'manual'

  function apply() {
    applying = true
    let found = false
    try {
      found = adapter.apply(new URL(location.href))
    } catch (error) {
      if (!(error instanceof URIError)) throw error
    }
    unavailable = !found
    if (found) adapter.render()
    else {
      const app = document.getElementById('app')
      if (app) {
        app.replaceChildren()
        const main = document.createElement('main')
        main.className = 'wrap'
        const title = document.createElement('h1')
        title.textContent = 'Page not found'
        const link = document.createElement('a')
        link.href = adapter.home
        link.textContent = 'Back to app'
        main.append(title, link)
        app.append(main)
      }
      document.body.style.overflow = ''
    }
    applying = false
    // Views may redirect to an available screen (e.g. a finished session).
    if (found) current = adapter.read()
    else current = location.pathname + location.search
    history.replaceState(previousState(), '', current)
  }

  window.addEventListener('popstate', (event) => {
    if (reverting) {
      reverting = false
      return
    }
    const target = event.state?.prototypeIndex ?? 0
    if (adapter.dirty?.() && !window.confirm('Discard unsaved changes?')) {
      reverting = true
      history.go(index - target)
      return
    }
    index = target
    apply()
    window.scrollTo(0, 0)
  })
  window.addEventListener('beforeunload', (event) => {
    if (!adapter.dirty?.()) return
    event.preventDefault()
    event.returnValue = true
  })

  apply()
  return {
    get unavailable() {
      return unavailable
    },
    sync() {
      if (applying) return
      const next = adapter.read()
      if (next === current) return
      current = next
      index += 1
      history.pushState(previousState(), '', current)
    },
  }
}
