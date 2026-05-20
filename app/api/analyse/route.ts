import { NextRequest, NextResponse } from 'next/server'
import { askAI } from '@/lib/ai'

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

  try {
    const text = await askAI(prompt, 512)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 529 || status === 429) {
      return NextResponse.json({ error: 'The AI is very busy right now. Please try again in a few seconds.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to analyse email.' }, { status: 500 })
  }
}
