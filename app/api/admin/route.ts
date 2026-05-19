import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('key')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const kvUrl = process.env.UPSTASH_REDIS_REST_URL
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!kvUrl || !kvToken) {
    return NextResponse.json({ count: 0 })
  }

  const res = await fetch(`${kvUrl}/get/email_count`, {
    headers: { Authorization: `Bearer ${kvToken}` },
  })
  const data = await res.json()
  const count = parseInt(data.result ?? '0', 10)

  return NextResponse.json({ count })
}
