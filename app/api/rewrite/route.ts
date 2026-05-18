import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'professional and polished, suitable for a corporate environment',
  friendly: 'warm and friendly while remaining professional',
  firm: 'firm, direct and assertive without being aggressive',
  apologetic: 'apologetic, empathetic and conciliatory',
  chasing: 'politely but clearly chasing for payment or an overdue response',
  formal: 'formally written, appropriate for legal or HR correspondence',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type = 'rewrite', tone } = body
  const toneDesc = TONE_DESCRIPTIONS[tone] ?? TONE_DESCRIPTIONS.professional

  let prompt: string

  if (type === 'generate') {
    const { about, recipient, points } = body
    if (!about?.trim()) {
      return NextResponse.json({ error: 'Please describe what the email is about.' }, { status: 400 })
    }
    prompt = `You are an expert business email writer. Write a complete, polished email with a ${toneDesc} tone. Use British English spelling.

Details:
- What it's about: ${about}
${recipient?.trim() ? `- Recipient: ${recipient}` : ''}
${points?.trim() ? `- Key points to include:\n${points}` : ''}

Return ONLY valid JSON with exactly these fields:
{
  "subject": "a suggested email subject line",
  "rewritten": "the full polished email body",
  "shorter": "a concise version of the same email in 2-3 sentences maximum"
}`
  } else {
    const { email } = body
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email content is required.' }, { status: 400 })
    }
    prompt = `You are an expert business email writer. Rewrite the following email or bullet points into a polished email with a ${toneDesc} tone. Use British English spelling.

Input:
${email}

Return ONLY valid JSON with exactly these fields:
{
  "subject": "a suggested email subject line",
  "rewritten": "the full polished email body",
  "shorter": "a concise version of the same email in 2-3 sentences maximum"
}`
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 })
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
