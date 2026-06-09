import fs from 'fs'
import os from 'os'
import path from 'path'
import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

let cached = global.mongooseCache

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null }
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    const options: mongoose.ConnectOptions = { bufferCommands: false }

    const pem = process.env.MONGODB_TLS_CERT_KEY_PEM
    let uri = MONGODB_URI
    if (pem) {
      const certPath = path.join(os.tmpdir(), 'mongodb-client.pem')
      // Env vars often store the PEM with literal "\n" instead of real newlines
      fs.writeFileSync(certPath, pem.replace(/\\n/g, '\n'), { mode: 0o600 })
      options.tls = true
      options.tlsCertificateKeyFile = certPath
      options.authMechanism = 'MONGODB-X509'
      options.authSource = '$external'
      // X.509 auth does not allow embedded credentials in the URI
      const parsed = new URL(uri)
      parsed.username = ''
      parsed.password = ''
      uri = parsed.toString()
    }

    cached.promise = mongoose.connect(uri, options).catch((err) => {
      cached.promise = null
      throw err
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
