import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['public', 'viewer', 'admin'], default: 'viewer' },
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
    console.error('Usage: pnpm create-user -- --email=<email> --name=<name> [--role=public|viewer|admin]')
    process.exit(1)
  }

  if (!['public', 'viewer', 'admin'].includes(role)) {
    console.error('Role must be "public", "viewer", or "admin"')
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

  await User.create({ email, name, role: role as 'public' | 'viewer' | 'admin' })

  console.log(`✓ Created user: ${email} (role: ${role})`)
  console.log(`  They can access the app once the gateway forwards their headers.`)
  await mongoose.disconnect()
}

createUser().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
