import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

// The comment event types were split into add/edit/delete. Existing rows
// captured under the old single types represent "add" actions, so rename them.
const RENAMES: Array<{ from: string; to: string }> = [
  { from: 'blog_comment', to: 'blog_comment_add' },
  { from: 'update_comment', to: 'update_comment_add' },
]

async function migrate() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)

  const collection = mongoose.connection.collection('analyticsevents')

  for (const { from, to } of RENAMES) {
    const result = await collection.updateMany({ type: from }, { $set: { type: to } })
    console.log(`✓ Renamed ${result.modifiedCount} "${from}" event(s) → "${to}"`)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
