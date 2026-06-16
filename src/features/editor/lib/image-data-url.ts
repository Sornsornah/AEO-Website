// Client-side image helpers — encode images to base64 data URLs so they can be
// stored inline (in the doc) without a server upload, which is restricted in
// deploy. Used by the product logo/screenshot and blog cover-image fields.

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// Downscale an image so its width is at most `maxWidth` (never upscales),
// returning a base64 data URL. PNGs stay lossless (crisp screenshot text);
// JPEG/WebP re-encode at high quality.
function downscaleImageToDataUrl(file: File, maxWidth: number): Promise<string> {
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
      resolve(canvas.toDataURL(mime, 0.92))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
    img.src = url
  })
}

/**
 * Encode an image file to a base64 data URL. Pass `maxWidth` to downscale wide
 * images (e.g. screenshots/covers); omit it to keep the original size (logos).
 * SVGs always pass through untouched (no raster width to scale).
 */
export function encodeImageFile(file: File, maxWidth?: number): Promise<string> {
  if (!maxWidth || file.type === 'image/svg+xml') return readFileAsDataUrl(file)
  return downscaleImageToDataUrl(file, maxWidth)
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
