import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const DomainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
)

const domains = [
  { name: 'Performance', slug: 'performance' },
  { name: 'Products', slug: 'products' },
  { name: 'Central Solutions', slug: 'central-solutions' },
  { name: 'Frontier', slug: 'frontier' },
]

async function seedDomains() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)

  const Domain = mongoose.model('Domain', DomainSchema)

  for (const d of domains) {
    const existing = await Domain.findOne({ slug: d.slug })
    if (existing) {
      console.log(`  - "${d.name}" already exists, skipping`)
    } else {
      await Domain.create(d)
      console.log(`  + Created "${d.name}"`)
    }
  }

  console.log('✓ Done')
  await mongoose.disconnect()
}

seedDomains().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
