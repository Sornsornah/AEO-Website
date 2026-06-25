import fs from 'fs'
import os from 'os'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

// Mirror src/lib/mongodb.ts: the DB uses X.509 client-cert auth when
// MONGODB_TLS_CERT_KEY_PEM is set, so a plain mongoose.connect fails TLS.
async function connect() {
  const options: mongoose.ConnectOptions = { bufferCommands: false }
  let uri = MONGODB_URI
  const pem = process.env.MONGODB_TLS_CERT_KEY_PEM
  if (pem) {
    const certPath = path.join(os.tmpdir(), 'mongodb-client.pem')
    fs.writeFileSync(certPath, pem.replace(/\\n/g, '\n'), { mode: 0o600 })
    options.tls = true
    options.tlsCertificateKeyFile = certPath
    options.authMechanism = 'MONGODB-X509'
    options.authSource = '$external'
    const parsed = new URL(uri)
    parsed.username = ''
    parsed.password = ''
    uri = parsed.toString()
  }
  await mongoose.connect(uri, options)
}

/**
 * One-time migration for the legacy blog category slugs.
 *
 * New posts used to default to the hardcoded slug `thought`, which no longer
 * exists in the admin-managed BlogCategory list (it was renamed to
 * `thought-pieces`). Such posts render with the legacy "Thought" label even
 * though no matching category exists in admin. This remaps the old slugs to the
 * current ones so every post points at a real category.
 */
const SLUG_MIGRATION_MAP: Record<string, string> = {
  thought: 'thought-pieces',
  'field-notes': 'case-studies',
  'deep-dive': 'how-to-guides',
}

async function migrate() {
  await connect()

  const BlogPost = mongoose.connection.collection('blogposts')

  for (const [oldSlug, newSlug] of Object.entries(SLUG_MIGRATION_MAP)) {
    const result = await BlogPost.updateMany(
      { category: oldSlug },
      { $set: { category: newSlug } }
    )
    if (result.modifiedCount > 0) {
      console.log(`✓ Remapped ${result.modifiedCount} post(s): "${oldSlug}" → "${newSlug}"`)
    } else {
      console.log(`  No posts with category "${oldSlug}"`)
    }
  }

  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
