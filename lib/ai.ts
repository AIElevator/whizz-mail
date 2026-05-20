import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// Clients instantiated lazily so missing env vars don't break the build
let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null

function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function askAI(prompt: string, maxTokens = 1024): Promise<string> {
  // Try Anthropic first
  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Non-text response')
    return content.text
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    // Only fall back on overload (529) or rate limit (429)
    if (status !== 529 && status !== 429) throw err
  }

  // Fallback: wait briefly then try OpenAI
  await new Promise((r) => setTimeout(r, 1000))
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return completion.choices[0]?.message?.content ?? ''
}
