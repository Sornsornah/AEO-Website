import mongoose from 'mongoose'

const SOURCE_URI = 'mongodb://localhost:27017/updatecentral'
const TARGET_URI = 'mongodb+srv://REDACTED@REDACTED/'

async function migrate() {
  console.log('Connecting to source (local)...')
  const source = await mongoose.createConnection(SOURCE_URI).asPromise()

  console.log('Connecting to target (Atlas)...')
  const target = await mongoose.createConnection(TARGET_URI).asPromise()

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
