'use client'

import { useCallback, useState } from 'react'

/** The picture a PhotoViewer shows: src and the name as this viewer may see it. */
export type ViewedPhoto = { src: string; name: string; label?: string }

/**
 * Open/close state for one PhotoViewer, so containers don't repeat it. Spread `viewerProps` into
 * PhotoViewer when `viewerProps` is not null; the last photo stays set while it closes so the fade
 * out still shows it.
 *
 *   const photo = usePhotoViewer()
 *   <Avatar name={p.name} src={p.photoUrl} onView={() => photo.show({ src, name: p.name })} />
 *   {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
 */
export function usePhotoViewer() {
  const [photo, setPhoto] = useState<ViewedPhoto | null>(null)
  const [open, setOpen] = useState(false)
  const show = useCallback((next: ViewedPhoto) => {
    setPhoto(next)
    setOpen(true)
  }, [])
  const close = useCallback(() => setOpen(false), [])
  return {
    open,
    photo,
    show,
    close,
    viewerProps: photo ? { ...photo, open, onClose: close } : null,
  }
}
