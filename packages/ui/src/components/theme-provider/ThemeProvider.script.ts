/**
 * Inline script for the root layout's <head>. It applies the remembered theme before first paint, so a
 * viewer who chose light never sees a dark flash. Render it as
 * `<script dangerouslySetInnerHTML={{ __html: getThemeScript('rotra-queue-theme') }} />`
 * and put `suppressHydrationWarning` on <html>, because the script may change data-theme before React
 * hydrates.
 */
export function getThemeScript(storageKey: string) {
  return `try{var t=localStorage.getItem(${JSON.stringify(storageKey)});if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`
}
