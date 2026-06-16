import { NextResponse } from 'next/server'

// TEMPORARY diagnostic — reports which env vars are PRESENT (booleans only, no
// values/secrets) so we can tell whether the staging dev-auth bypass is failing
// due to missing env vars vs stale deployed code. DELETE after debugging.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    allowDevAuthIsTrue: process.env.ALLOW_DEV_AUTH === 'true',
    allowDevAuthPresent: typeof process.env.ALLOW_DEV_AUTH === 'string',
    devUserEmailPresent: !!process.env.DEV_USER_EMAIL,
    devUserNamePresent: !!process.env.DEV_USER_NAME,
    mongoUriPresent: !!process.env.MONGODB_URI,
    // Presence of this endpoint at all confirms the deploy used current code,
    // which means src/middleware.ts also has the ALLOW_DEV_AUTH gate.
    hasAllowDevAuthCode: true,
  })
}
