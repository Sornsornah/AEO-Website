import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['viewer', 'admin'], default: 'viewer' },
  isWhitelisted: { type: Boolean, default: false },
}, { timestamps: true })

function getArg(flag: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`))
  return arg?.split('=').slice(1).join('=')
}

async function createUser() {
  const email = getArg('email')
  const name = getArg('name')
  const role = getArg('role') ?? 'viewer'

  if (!email || !name) {
    console.error('Usage: npm run create-user -- --email=<email> --name=<name> [--role=viewer|admin]')
    process.exit(1)
  }

  if (!['viewer', 'admin'].includes(role)) {
    console.error('Role must be "viewer" or "admin"')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User', UserSchema)

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    console.error(`User ${email} already exists`)
    await mongoose.disconnect()
    process.exit(1)
  }

  await User.create({ email, name, role, isWhitelisted: true })

  console.log(`✓ Created user: ${email} (role: ${role}, whitelisted: true)`)
  console.log(`  They can sign in at /login using their email — a code will be sent.`)
  await mongoose.disconnect()
}

createUser().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
