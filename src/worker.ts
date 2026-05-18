const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']

let stopping = false

function shutdown(signal: NodeJS.Signals) {
  if (stopping) return
  stopping = true
  console.log(`[worker] received ${signal}, shutting down`)
  process.exit(0)
}

for (const signal of SHUTDOWN_SIGNALS) {
  process.on(signal, shutdown)
}

console.log('[worker] started (stub) — no scheduled jobs configured yet')

setInterval(() => {
  if (stopping) return
  console.log(`[worker] heartbeat ${new Date().toISOString()}`)
}, 60_000)
