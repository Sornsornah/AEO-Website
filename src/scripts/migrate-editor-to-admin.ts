import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  role: { type: String, default: 'viewer' },
  isWhitelisted: { type: Boolean, default: false },
}, { timestamps: true })

async function migrate() {
  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User', UserSchema)

  const result = await User.updateMany({ role: 'editor' }, { $set: { role: 'admin' } })
  console.log(`✓ Migrated ${result.modifiedCount} editor(s) to admin`)

  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
