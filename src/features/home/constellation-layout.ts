// Shared source of truth for the homepage "constellation" — the scattered
// product-logo arrangement rendered by ProductsCarousel and previewed in the
// admin Homepage tab. Keeping both surfaces on the same data means the admin
// preview is an exact rehearsal of what ships.

export interface Slot {
  left: number
  top: number
  size: number
  rot: number
  dur: number
  delay: number
}

export const MAX_CONSTELLATION = 8

// The natural pixel width the slot sizes were tuned against (max-w-6xl). The
// admin preview scales tile sizes by its own width / this reference so the
// proportions match the live section at any panel width.
export const CONSTELLATION_REFERENCE_WIDTH = 1152

// Hand-tuned, balanced layouts per product count (1–8). Each set rings the
// central title and clears the middle text column. Positions are percentages
// of the canvas; size/rotation/drift vary per tile for life.
export const CONSTELLATION_LAYOUTS: Record<number, Slot[]> = {
  1: [{ left: 50, top: 16, size: 108, rot: -4, dur: 6.8, delay: 0 }],
  2: [
    { left: 19, top: 25, size: 104, rot: -7, dur: 6.6, delay: 0 },
    { left: 81, top: 25, size: 104, rot: 6, dur: 7.2, delay: 0.3 },
  ],
  3: [
    { left: 18, top: 24, size: 100, rot: -7, dur: 6.6, delay: 0 },
    { left: 82, top: 25, size: 100, rot: 6, dur: 7.2, delay: 0.3 },
    { left: 50, top: 84, size: 96, rot: -3, dur: 7.0, delay: 0.6 },
  ],
  4: [
    { left: 17, top: 23, size: 104, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 24, size: 100, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 21, top: 82, size: 94, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 79, top: 83, size: 96, rot: 5, dur: 7.6, delay: 0.15 },
  ],
  5: [
    { left: 16, top: 27, size: 100, rot: -7, dur: 6.6, delay: 0 },
    { left: 84, top: 28, size: 98, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 23, top: 82, size: 92, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 77, top: 83, size: 94, rot: 5, dur: 7.6, delay: 0.15 },
    { left: 50, top: 12, size: 96, rot: -3, dur: 7.3, delay: 0.8 },
  ],
  6: [
    { left: 17, top: 22, size: 104, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 23, size: 100, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 21, top: 83, size: 92, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 79, top: 84, size: 96, rot: 6, dur: 7.6, delay: 0.15 },
    { left: 9, top: 53, size: 82, rot: 5, dur: 7.4, delay: 0.8 },
    { left: 91, top: 55, size: 80, rot: -6, dur: 6.3, delay: 1.0 },
  ],
  7: [
    { left: 17, top: 24, size: 100, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 25, size: 98, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 21, top: 84, size: 92, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 79, top: 85, size: 94, rot: 6, dur: 7.6, delay: 0.15 },
    { left: 9, top: 55, size: 80, rot: 5, dur: 7.4, delay: 0.8 },
    { left: 91, top: 56, size: 80, rot: -6, dur: 6.3, delay: 1.0 },
    { left: 50, top: 11, size: 90, rot: -3, dur: 7.1, delay: 0.6 },
  ],
  8: [
    { left: 17, top: 25, size: 98, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 26, size: 96, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 20, top: 80, size: 90, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 80, top: 81, size: 92, rot: 6, dur: 7.6, delay: 0.15 },
    { left: 9, top: 54, size: 80, rot: 5, dur: 7.4, delay: 0.8 },
    { left: 91, top: 55, size: 78, rot: -6, dur: 6.3, delay: 1.0 },
    { left: 50, top: 11, size: 88, rot: -3, dur: 7.1, delay: 0.6 },
    { left: 50, top: 92, size: 86, rot: 4, dur: 6.7, delay: 0.35 },
  ],
}

export function buildSlots(n: number): Slot[] {
  if (n < 1) return []
  return CONSTELLATION_LAYOUTS[Math.min(n, MAX_CONSTELLATION)] ?? CONSTELLATION_LAYOUTS[MAX_CONSTELLATION]
}
