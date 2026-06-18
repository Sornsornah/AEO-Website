/**
 * One-off migration: move legacy inline base64 images/videos out of documents
 * and into GridFS, rewriting each `data:<mime>;base64,…` occurrence to a served
 * `/api/uploads/<id>` URL.
 *
 * Why: the deploy WAF rejects any request body containing ";base64,", so editing
 * + re-saving a document that still holds inline base64 fails with a 403. New
 * content already uploads to GridFS; this fixes the historical rows.
 *
 * Covers standalone fields (coverImage, logoUrl, uiScreenshot, useCases[].image)
 * and base64 embedded in Tiptap HTML bodies (content/overview/comments/etc.) by
 * deep-walking every string in the document.
 *
 * Usage:
 *   tsx src/scripts/migrate-inline-images.ts                 # dry run, .env.local
 *   tsx src/scripts/migrate-inline-images.ts --env .env.staging
 *   tsx src/scripts/migrate-inline-images.ts --env .env.staging --apply
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { Readable } from 'stream'

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1]
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`))
  return eq?.split('=').slice(1).join('=')
}

const ENV_FILE = argValue('--env') || '.env.local'
const APPLY = process.argv.includes('--apply')
dotenv.config({ path: path.resolve(process.cwd(), ENV_FILE) })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error(`No MONGODB_URI found (loaded ${ENV_FILE}).`)
  process.exit(1)
}

// Collections (and the implicit string fields within) that can hold base64.
const COLLECTIONS = ['comments', 'blogcomments', 'blogposts', 'products', 'updates']

const MAX_BYTES = 50 * 1024 * 1024 // mirror /api/uploads limit
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
}

// A contiguous base64 data URI. The base64 charset stops at the first quote/
// angle-bracket, so this lifts a clean token out of HTML or a bare field value.
const DATA_URI_RE = /data:(?:image|video)\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g

type Json = unknown
function isPlainContainer(v: unknown): v is Record<string, Json> | Json[] {
  if (Array.isArray(v)) return true
  if (!v || typeof v !== 'object') return false
  // Skip BSON types (ObjectId etc.), Date and Buffer — leave them untouched.
  const o = v as { _bsontype?: unknown }
  return !o._bsontype && !(v instanceof Date) && !Buffer.isBuffer(v)
}

function eachString(value: Json, cb: (s: string) => void): void {
  if (typeof value === 'string') cb(value)
  else if (Array.isArray(value)) value.forEach((v) => eachString(v, cb))
  else if (isPlainContainer(value)) for (const k of Object.keys(value)) eachString((value as Record<string, Json>)[k], cb)
}

function mapStrings(value: Json, fn: (s: string) => string): Json {
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn))
  if (isPlainContainer(value)) {
    const out: Record<string, Json> = {}
    for (const k of Object.keys(value)) out[k] = mapStrings((value as Record<string, Json>)[k], fn)
    return out
  }
  return value
}

function bytesOf(dataUri: string): number {
  const b64 = dataUri.slice(dataUri.indexOf(';base64,') + ';base64,'.length)
  return Math.floor((b64.length * 3) / 4)
}

async function uploadDataUri(db: mongoose.mongo.Db, dataUri: string): Promise<string> {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUri)!
  const mime = m[1]
  const buffer = Buffer.from(m[2], 'base64')
  const ext = EXT_BY_MIME[mime] || 'bin'
  const { GridFSBucket } = mongoose.mongo
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' })
  const uploadStream = bucket.openUploadStream(`${Date.now()}-migrated.${ext}`, { metadata: { contentType: mime } })
  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer).pipe(uploadStream).on('finish', () => resolve()).on('error', reject)
  })
  return `/api/uploads/${uploadStream.id}`
}

async function run() {
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — env ${ENV_FILE}\n`)
  await mongoose.connect(MONGODB_URI!)
  const db = mongoose.connection.db!

  let totalDocs = 0
  let totalImages = 0
  let totalBytes = 0

  for (const coll of COLLECTIONS) {
    const docs = await db.collection(coll).find({}).toArray()
    let changedDocs = 0
    let collImages = 0

    for (const doc of docs) {
      const uris = new Set<string>()
      eachString(doc, (s) => {
        const matches = s.match(DATA_URI_RE)
        if (matches) for (const u of matches) uris.add(u)
      })
      if (uris.size === 0) continue

      const oversized = [...uris].filter((u) => bytesOf(u) > MAX_BYTES)
      const migratable = [...uris].filter((u) => bytesOf(u) <= MAX_BYTES)
      const docBytes = migratable.reduce((n, u) => n + bytesOf(u), 0)

      changedDocs++
      collImages += migratable.length
      totalBytes += docBytes
      console.log(
        `  ${coll}/${String(doc._id)} — ${migratable.length} image(s), ${(docBytes / 1024).toFixed(0)} KB` +
          (oversized.length ? `  [SKIP ${oversized.length} over ${MAX_BYTES / 1024 / 1024}MB]` : '')
      )

      if (APPLY && migratable.length) {
        const map = new Map<string, string>()
        for (const u of migratable) map.set(u, await uploadDataUri(db, u))
        const newDoc = mapStrings(doc, (s) => {
          let r = s
          for (const [u, url] of map) r = r.split(u).join(url)
          return r
        }) as Record<string, unknown>
        await db.collection(coll).replaceOne({ _id: doc._id }, newDoc)
      }
    }

    totalDocs += changedDocs
    totalImages += collImages
    console.log(`${coll}: ${changedDocs} doc(s) with inline base64, ${collImages} image(s)\n`)
  }

  console.log(
    `${APPLY ? 'Migrated' : 'Would migrate'} ${totalImages} image(s) across ${totalDocs} doc(s), ${(totalBytes / 1024 / 1024).toFixed(2)} MB total.`
  )
  if (!APPLY && totalImages > 0) console.log('Re-run with --apply to write changes.')
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
