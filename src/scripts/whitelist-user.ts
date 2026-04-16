import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  hashedPassword: { type: String, required: true },
  role: { type: String, enum: ['viewer', 'admin'], default: 'viewer' },
  isWhitelisted: { type: Boolean, default: false },
}, { timestamps: true })

function getArg(flag: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`))
  return arg?.split('=').slice(1).join('=')
}

async function whitelistUser() {
  const email = getArg('email')
  const revoke = process.argv.includes('--revoke')

  if (!email) {
    console.error('Usage: npm run whitelist-user -- --email=<email> [--revoke]')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User', UserSchema)

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { isWhitelisted: !revoke },
    { new: true }
  )

  if (!user) {
    console.error(`User ${email} not found`)
    await mongoose.disconnect()
    process.exit(1)
  }

  const action = revoke ? 'Revoked access for' : 'Whitelisted'
  console.log(`✓ ${action}: ${user.email} (role: ${user.role})`)
  await mongoose.disconnect()
}

whitelistUser().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
