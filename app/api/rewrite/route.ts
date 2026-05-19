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

Rules you must follow without exception:
- Do not add a sign-off or closing unless the user has specified one
- Cut filler words that add length without meaning: "currently", "essentially", "actually", "certainly", "necessarily", "basically", "generally", "at this stage", "at this point in time", "in terms of"
- Prefer direct constructions: "There are 87 quotes" not "We currently have 87 quotes"
- Match the tone genuinely — "friendly" means natural and warm, not formal language dressed up

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
  } else if (type === 'reply') {
    const { thread, answers } = body
    if (!thread?.trim()) {
      return NextResponse.json({ error: 'Please paste the email you want to reply to.' }, { status: 400 })
    }
    const answersText = Array.isArray(answers) && answers.length
      ? answers
          .filter((a: { question: string; answer: string }) => a.answer?.trim())
          .map((a: { question: string; answer: string }) => `- ${a.question}\n  Answer: ${a.answer}`)
          .join('\n')
      : ''
    prompt = `You are an expert business email writer. Write a reply to the following email thread with a ${toneDesc} tone. Use British English spelling.

Rules you must follow without exception:
- Do not add a sign-off or closing unless the user has specified one in their context notes
- Cut filler words that add length without meaning: "currently", "essentially", "actually", "certainly", "necessarily", "basically", "generally", "at this stage", "at this point in time", "in terms of"
- Prefer direct constructions: "There are 87 quotes" not "We currently have 87 quotes"
- Match the tone genuinely — "friendly" means natural and warm, not formal language dressed up

Email thread to reply to:
${thread}
${answersText ? `\nContext for the reply (use these to shape the content):\n${answersText}` : ''}

Return ONLY valid JSON with exactly these fields:
{
  "subject": "Re: [appropriate subject line for the reply]",
  "rewritten": "the full reply email body only — do not include the original email",
  "shorter": "a concise version of the reply in 2-3 sentences maximum"
}`
  } else {
    const { email } = body
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email content is required.' }, { status: 400 })
    }
    prompt = `You are an expert business email writer. Rewrite the following email or bullet points into a polished email with a ${toneDesc} tone. Use British English spelling.

Rules you must follow without exception:
- Preserve the exact greeting from the input (e.g. if it starts "Hi Kim," keep "Hi Kim," — never change it to "Dear Kim,")
- Do not add a sign-off or closing (e.g. "Best regards", "Kind regards", "Yours sincerely") unless one is already present in the input
- Do not add a name or signature unless one is already present in the input
- Cut filler words that add length without meaning: "currently", "essentially", "actually", "certainly", "necessarily", "basically", "generally", "at this stage", "at this point in time", "in terms of" — remove them or recast the sentence without them
- Prefer direct constructions: "There are 87 quotes" not "We currently have 87 quotes"; "Invoices remain unpaid" not "Invoices are currently outstanding"
- Match the tone genuinely — "friendly" means natural and warm, not formal language dressed up; never use stiff phrases like "I commenced my engagement" when "I started working" says the same thing better

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
