'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cropImageToFile } from '@/features/editor/lib/image-data-url'

interface CropOptions {
  /** Lock the crop box to a fixed aspect ratio (e.g. 16/9). Omit for free-form. */
  aspect?: number
  title?: string
}

// Only still raster formats are cropped; SVG/GIF pass through untouched so we
// don't rasterise vectors or drop animation frames.
const CROPPABLE = new Set(['image/png', 'image/jpeg', 'image/webp'])

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
]

/**
 * Hook providing a shared crop dialog. Render `cropDialog` once, then
 * `await requestCrop(file)` from a paste/upload handler: it opens the dialog and
 * resolves with the cropped `File` (Apply), the original file (non-croppable
 * format), or `null` (Cancel). Hand the result to `uploadImage`.
 */
export function useImageCrop() {
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  // The selected preset (undefined = "Free"). Free follows the image's own shape
  // (naturalAspect) so the whole picture fits with no empty space or trimming.
  const [presetAspect, setPresetAspect] = useState<number | undefined>(undefined)
  const [naturalAspect, setNaturalAspect] = useState<number | undefined>(undefined)
  const [fixedAspect, setFixedAspect] = useState(false)
  const [title, setTitle] = useState('Crop image')
  const [busy, setBusy] = useState(false)

  // Crop window aspect. cover (below) keeps it always filled by the image, so the
  // crop can never extend past the picture into empty space.
  const aspect = presetAspect ?? naturalAspect ?? 4 / 3

  const fileRef = useRef<File | null>(null)
  const areaRef = useRef<Area | null>(null)
  const resolverRef = useRef<((f: File | null) => void) | null>(null)

  const cleanup = useCallback(() => {
    if (src) URL.revokeObjectURL(src)
    setSrc(null)
    fileRef.current = null
    areaRef.current = null
  }, [src])

  const settle = useCallback((result: File | null) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOpen(false)
    setBusy(false)
    cleanup()
  }, [cleanup])

  const requestCrop = useCallback((file: File, opts?: CropOptions): Promise<File | null> => {
    if (!CROPPABLE.has(file.type)) return Promise.resolve(file)
    fileRef.current = file
    setSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setPresetAspect(opts?.aspect)
    setNaturalAspect(undefined)
    setFixedAspect(opts?.aspect != null)
    setTitle(opts?.title ?? 'Crop image')
    setOpen(true)
    return new Promise<File | null>((resolve) => { resolverRef.current = resolve })
  }, [])

  const handleApply = useCallback(async () => {
    const file = fileRef.current
    const area = areaRef.current
    if (!file || !area) { settle(file ?? null); return }
    setBusy(true)
    try {
      settle(await cropImageToFile(file, area))
    } catch {
      settle(file) // fall back to the uncropped original rather than blocking the user
    }
  }, [settle])

  const cropDialog = (
    <Dialog open={open} onOpenChange={(o) => { if (!o) settle(null) }}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative h-[340px] w-full overflow-hidden rounded-md bg-slate-900">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              // Image always covers the crop frame → the crop can never include
              // area outside the picture (no empty bars).
              objectFit="cover"
              onMediaLoaded={(m) => setNaturalAspect(m.naturalWidth / m.naturalHeight)}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => { areaRef.current = areaPixels }}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-36 accent-slate-700"
            />
          </label>

          {!fixedAspect && (
            <div className="flex items-center gap-1">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPresetAspect(p.value)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    presetAspect === p.value
                      ? 'bg-slate-200 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => settle(null)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={busy}>
            {busy ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { cropDialog, requestCrop }
}
