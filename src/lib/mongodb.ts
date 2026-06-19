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
    console.error('[mongodb] MONGODB_URI is not defined')
    throw new Error('Please define the MONGODB_URI environment variable')
  }

  if (cached.conn) {
    console.log('[mongodb] reusing cached connection')
    return cached.conn
  }

  if (!cached.promise) {
    console.log('[mongodb] no cached connection — establishing a new one')
    const options: mongoose.ConnectOptions = { bufferCommands: false }

    const pem = process.env.MONGODB_TLS_CERT_KEY_PEM
    let uri = MONGODB_URI
    if (pem) {
      console.log(`[mongodb] MONGODB_TLS_CERT_KEY_PEM is set (length=${pem.length}) — using X.509 auth`)
      try {
        const certPath = path.join(os.tmpdir(), 'mongodb-client.pem')
        // Env vars often store the PEM with literal "\n" instead of real newlines
        const pemContents = pem.replace(/\\n/g, '\n')
        fs.writeFileSync(certPath, pemContents, { mode: 0o600 })
        console.log(`[mongodb] wrote client cert to ${certPath} (${pemContents.length} bytes)`)
        console.log(
          `[mongodb] cert sanity: starts with "${pemContents.slice(0, 27).trim()}", ` +
            `has BEGIN=${pemContents.includes('-----BEGIN')}, has END=${pemContents.includes('-----END')}`
        )
        options.tls = true
        options.tlsCertificateKeyFile = certPath
        options.authMechanism = 'MONGODB-X509'
        options.authSource = '$external'
        // X.509 auth does not allow embedded credentials in the URI
        const parsed = new URL(uri)
        parsed.username = ''
        parsed.password = ''
        uri = parsed.toString()
        console.log(`[mongodb] X.509 options prepared, connecting to host: ${parsed.host}`)
      } catch (certErr) {
        console.error('[mongodb] failed while preparing the client certificate:', certErr)
        throw certErr
      }
    } else {
      console.log('[mongodb] MONGODB_TLS_CERT_KEY_PEM not set — connecting without X.509 cert')
    }

    cached.promise = mongoose
      .connect(uri, options)
      .then((conn) => {
        console.log('[mongodb] connection established successfully')
        return conn
      })
      .catch((err) => {
        cached.promise = null
        console.error('[mongodb] connection failed:', err?.message || err)
        throw err
      })
  } else {
    console.log('[mongodb] awaiting in-flight connection promise')
  }

  cached.conn = await cached.promise
  return cached.conn
}
