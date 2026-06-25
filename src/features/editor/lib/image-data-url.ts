// Client-side image helpers. Images are uploaded to GridFS (POST /api/uploads)
// and referenced by URL — never inlined as base64 `data:` URIs. The deploy WAF
// rejects any request body containing the substring ";base64," with a 403, so
// inlining a pasted image broke comment/blog/product saves on staging.

// Downscale an image so its width is at most `maxWidth` (never upscales),
// returning a Blob. PNGs stay lossless (crisp screenshot text); JPEG/WebP
// re-encode at high quality. Uses canvas.toBlob (not toDataURL) so we never
// materialise a base64 string anywhere.
function downscaleImageToBlob(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = document.createElement('img')
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, w, h)
      const mime = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png'
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), mime, 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/svg+xml': 'svg',
}

/** Pixel crop rectangle (matches react-easy-crop's `Area`). */
export interface PixelCrop { x: number; y: number; width: number; height: number }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = document.createElement('img')
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}

/**
 * Crop (and optionally rotate) an image to the given pixel rectangle, returning a
 * Blob. Like `downscaleImageToBlob`, this uses `canvas.toBlob` — never `toDataURL`
 * — so no base64 `data:` string is ever produced (the deploy WAF 403s ";base64,").
 * PNGs stay lossless; JPEG/WebP re-encode at high quality.
 */
export async function cropImageToBlob(file: File, crop: PixelCrop, rotation = 0): Promise<Blob> {
  const img = await loadImage(file)
  const rad = (rotation * Math.PI) / 180
  const { naturalWidth: iw, naturalHeight: ih } = img

  // Draw the (rotated) image onto a safe-area canvas, then lift the crop rect out.
  const safeW = Math.abs(Math.cos(rad) * iw) + Math.abs(Math.sin(rad) * ih)
  const safeH = Math.abs(Math.sin(rad) * iw) + Math.abs(Math.cos(rad) * ih)
  const stage = document.createElement('canvas')
  stage.width = Math.ceil(safeW)
  stage.height = Math.ceil(safeH)
  const sctx = stage.getContext('2d')
  if (!sctx) throw new Error('Canvas not supported')
  sctx.translate(safeW / 2, safeH / 2)
  sctx.rotate(rad)
  sctx.drawImage(img, -iw / 2, -ih / 2)

  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(crop.width))
  out.height = Math.max(1, Math.round(crop.height))
  const octx = out.getContext('2d')
  if (!octx) throw new Error('Canvas not supported')
  // crop coords are relative to the rotated image, offset into the safe area.
  const offX = (safeW - iw) / 2
  const offY = (safeH - ih) / 2
  octx.drawImage(stage, crop.x + offX, crop.y + offY, crop.width, crop.height, 0, 0, out.width, out.height)

  const mime = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png'
  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), mime, 0.92)
  })
}

/**
 * Crop an image file (see `cropImageToBlob`) and return a new `File`, preserving
 * the base name and using the encoded blob's extension. Ready to hand to
 * `uploadImage`, which then downscales + uploads it.
 */
export async function cropImageToFile(file: File, crop: PixelCrop, rotation = 0): Promise<File> {
  const blob = await cropImageToBlob(file, crop, rotation)
  const base = (file.name || 'image').replace(/\.[^.]+$/, '')
  const ext = EXT_BY_MIME[blob.type] || 'png'
  return new File([blob], `${base}.${ext}`, { type: blob.type })
}

/**
 * Upload an image file to GridFS and return its served URL (`/api/uploads/<id>`).
 * Pass `maxWidth` to downscale wide images (screenshots/covers) before upload;
 * omit it to upload the original (logos). SVGs upload untouched. Throws on
 * failure so the caller can surface the error.
 */
export async function uploadImage(file: File, maxWidth?: number): Promise<string> {
  let payload: File = file
  if (maxWidth && file.type !== 'image/svg+xml') {
    const blob = await downscaleImageToBlob(file, maxWidth)
    const base = (file.name || 'image').replace(/\.[^.]+$/, '')
    const ext = EXT_BY_MIME[blob.type] || 'png'
    payload = new File([blob], `${base}.${ext}`, { type: blob.type })
  }
  const formData = new FormData()
  formData.append('file', payload)
  const res = await fetch('/api/uploads', { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || 'Upload failed')
  }
  const { url } = (await res.json()) as { url: string }
  return url
}

/**
 * Fetch an already-uploaded image (e.g. `/api/uploads/<id>`) back into a `File`,
 * so it can be re-opened in the crop dialog. Throws if the fetch fails.
 */
export async function fileFromUrl(url: string, name = 'image'): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not load image')
  const blob = await res.blob()
  const ext = EXT_BY_MIME[blob.type] || 'png'
  return new File([blob], `${name}.${ext}`, { type: blob.type })
}

/** Extract the first image File from a clipboard paste, or null if none. */
export function imageFileFromClipboardData(data: DataTransfer | null): File | null {
  if (!data) return null
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  return null
}

/**
 * True if the clipboard/drop payload carries a file that isn't an image (e.g. a
 * PDF or document). Used to reject pasting non-image files with a clear message.
 * Plain text/HTML paste items are `kind: 'string'`, not `'file'`, so they don't
 * count; an unknown/empty MIME type is treated as non-image (rejected).
 */
export function hasNonImageFile(data: DataTransfer | null): boolean {
  if (!data) return false
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    if (item.kind === 'file' && !item.type.startsWith('image/')) return true
  }
  return false
}
