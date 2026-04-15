import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

const DomainSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
}, { timestamps: true })

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  color: { type: String, default: '#6366f1' },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: false },
}, { timestamps: true })

async function migrate() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)

  const DomainModel = mongoose.model('Domain', DomainSchema)
  const ProductModel = mongoose.model('Product', ProductSchema)

  // Create "General" domain if it doesn't exist
  let domain = await DomainModel.findOne({ slug: 'general' })
  if (!domain) {
    domain = await DomainModel.create({ name: 'General', slug: 'general', description: 'Default domain' })
    console.log('✓ Created "General" domain')
  } else {
    console.log('  "General" domain already exists, skipping creation')
  }

  // Backfill products without a domainId
  const result = await ProductModel.updateMany(
    { domainId: { $exists: false } },
    { $set: { domainId: domain._id } }
  )
  console.log(`✓ Backfilled ${result.modifiedCount} product(s) to "General" domain`)

  await mongoose.disconnect()
  console.log('Done.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
