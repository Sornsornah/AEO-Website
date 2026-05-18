import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['public', 'viewer', 'admin'], default: 'public' },
}, { timestamps: true })

function getArg(flag: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`))
  return arg?.split('=').slice(1).join('=')
}

async function setRole() {
  const email = getArg('email')
  const role = getArg('role')

  if (!email || !role) {
    console.error('Usage: pnpm set-role -- --email=<email> --role=public|viewer|admin')
    process.exit(1)
  }

  if (!['public', 'viewer', 'admin'].includes(role)) {
    console.error('Role must be "public", "viewer", or "admin"')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User', UserSchema)

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: role as 'public' | 'viewer' | 'admin' },
    { new: true }
  )

  if (!user) {
    console.error(`No user found with email: ${email}`)
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log(`✓ Updated ${email} → role: ${role}`)
  await mongoose.disconnect()
}

setRole().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
