import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { thread } = await req.json()

  if (!thread?.trim()) {
    return NextResponse.json({ error: 'Please paste the email thread first.' }, { status: 400 })
  }

  const prompt = `You are an intelligent email assistant. Read the following email thread carefully and generate 2 to 4 specific, thoughtful questions that will help write the best possible reply.

The questions should be:
- Directly relevant to what the email is asking, proposing or discussing
- Specific enough that the answers will meaningfully shape the reply
- Varied: cover the key decision, any details needed, and the desired outcome
- Practical and easy to answer in a sentence or two

Email thread:
${thread}

Return ONLY valid JSON with exactly these fields:
{
  "summary": "one clear sentence describing what this email is about and what it needs",
  "questions": [
    { "id": "q1", "question": "first question" },
    { "id": "q2", "question": "second question" },
    { "id": "q3", "question": "third question (optional — only include if genuinely useful)" },
    { "id": "q4", "question": "fourth question (optional — only include if genuinely useful)" }
  ]
}`

  const makeRequest = () => client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  let message
  try {
    message = await makeRequest()
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 529) {
      await new Promise((r) => setTimeout(r, 3000))
      try {
        message = await makeRequest()
      } catch {
        return NextResponse.json({ error: 'The AI is very busy right now. Please try again in a few seconds.' }, { status: 503 })
      }
    } else {
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
  }

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response from AI.' }, { status: 500 })
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch {
    return NextResponse.json({ error: 'Failed to analyse email.' }, { status: 500 })
  }
}
