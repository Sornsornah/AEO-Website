import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

/**
 * One-time migration for the scheduling-feature removal.
 *
 *  - Blog posts with the legacy `status: 'scheduled'` become drafts.
 *  - Updates lose the now-defunct `scheduledAt` field. A scheduled update was an
 *    unpublished doc with a `scheduledAt`, so it is already a draft once the
 *    field is dropped — published docs keep their published state.
 */
async function migrate() {
  await mongoose.connect(MONGODB_URI)

  const BlogPost = mongoose.connection.collection('blogposts')
  const Update = mongoose.connection.collection('updates')

  const blogResult = await BlogPost.updateMany(
    { status: 'scheduled' },
    { $set: { status: 'draft' } }
  )
  console.log(`✓ Converted ${blogResult.modifiedCount} scheduled blog post(s) to draft`)

  const updateResult = await Update.updateMany(
    { scheduledAt: { $exists: true } },
    { $unset: { scheduledAt: '' } }
  )
  console.log(`✓ Removed scheduledAt from ${updateResult.modifiedCount} update(s)`)

  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
