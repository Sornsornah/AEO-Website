import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

// Pass --apply to actually write. Without it, the script only reports.
const APPLY = process.argv.includes('--apply')

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, default: 'public' },
  },
  { timestamps: true }
)

const BlogPostSchema = new mongoose.Schema(
  {
    title: String,
    slug: String,
    authorName: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, strict: false }
)

function norm(s: string): string {
  return s.trim().toLowerCase()
}

async function backfill() {
  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User', UserSchema)
  const BlogPost = mongoose.model('BlogPost', BlogPostSchema)

  // Legacy posts that were never stamped with an owner.
  const posts = await BlogPost.find({
    $or: [{ createdBy: { $exists: false } }, { createdBy: null }],
  }).lean<{ _id: mongoose.Types.ObjectId; title: string; authorName?: string }[]>()

  if (posts.length === 0) {
    console.log('✓ No blog posts missing createdBy — nothing to backfill.')
    await mongoose.disconnect()
    return
  }

  console.log(`Found ${posts.length} blog post(s) without createdBy.\n`)

  // Build a name → users index. Author names can collide, so we track every
  // user that shares a (normalised) name and only assign when it's unambiguous.
  const users = await User.find()
    .select('name email')
    .lean<{ _id: mongoose.Types.ObjectId; name: string; email: string }[]>()
  const byName = new Map<string, { _id: mongoose.Types.ObjectId; name: string; email: string }[]>()
  for (const u of users) {
    if (!u.name) continue
    const key = norm(u.name)
    const list = byName.get(key) ?? []
    list.push(u)
    byName.set(key, list)
  }

  let matched = 0
  const ambiguous: string[] = []
  const unmatched: string[] = []
  const ops: { updateOne: { filter: object; update: object } }[] = []

  for (const post of posts) {
    const author = post.authorName ? norm(post.authorName) : ''
    const candidates = author ? byName.get(author) ?? [] : []

    if (candidates.length === 1) {
      const u = candidates[0]
      console.log(`  ✓ "${post.title}" → ${u.name} <${u.email}>`)
      ops.push({
        updateOne: { filter: { _id: post._id }, update: { $set: { createdBy: u._id } } },
      })
      matched++
    } else if (candidates.length > 1) {
      const who = candidates.map((c) => `${c.name} <${c.email}>`).join(', ')
      console.log(`  ⚠ "${post.title}" — author "${post.authorName}" matches ${candidates.length} users: ${who} (skipped)`)
      ambiguous.push(post.title)
    } else {
      console.log(`  ✗ "${post.title}" — no user matches author "${post.authorName ?? '(none)'}" (skipped)`)
      unmatched.push(post.title)
    }
  }

  console.log(
    `\nSummary: ${matched} matched, ${ambiguous.length} ambiguous, ${unmatched.length} unmatched.`
  )

  if (!APPLY) {
    console.log('\nDry run — no changes written. Re-run with --apply to persist.')
    await mongoose.disconnect()
    return
  }

  if (ops.length > 0) {
    const res = await BlogPost.bulkWrite(ops)
    console.log(`\n✓ Updated ${res.modifiedCount} blog post(s) with createdBy.`)
  } else {
    console.log('\nNothing unambiguous to write.')
  }

  await mongoose.disconnect()
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message)
  process.exit(1)
})
