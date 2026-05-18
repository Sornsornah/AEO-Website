import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SOURCE_URI = process.env.MIGRATE_SOURCE_URI ?? 'mongodb://localhost:27017/updatecentral'
const TARGET_URI = process.env.MIGRATE_TARGET_URI ?? process.env.MONGODB_URI

if (!TARGET_URI) {
  console.error('Set MIGRATE_TARGET_URI (or MONGODB_URI) in .env.local')
  process.exit(1)
}

async function migrate() {
  console.log('Connecting to source (local)...')
  const source = await mongoose.createConnection(SOURCE_URI).asPromise()

  console.log('Connecting to target (Atlas)...')
  const target = await mongoose.createConnection(TARGET_URI!).asPromise()

  const collections = await source.db!.listCollections().toArray()
  console.log(`Found ${collections.length} collections: ${collections.map(c => c.name).join(', ')}\n`)

  for (const { name } of collections) {
    const sourceColl = source.collection(name)
    const targetColl = target.collection(name)

    const docs = await sourceColl.find({}).toArray()
    if (docs.length === 0) {
      console.log(`  ${name}: empty, skipping`)
      continue
    }

    await targetColl.deleteMany({})
    await targetColl.insertMany(docs)
    console.log(`  ${name}: copied ${docs.length} documents`)
  }

  await source.close()
  await target.close()
  console.log('Done.')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
