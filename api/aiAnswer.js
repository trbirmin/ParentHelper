// Subject-agnostic answer generator using Azure OpenAI Chat Completions API.
// Uses global fetch (Node 18+); no SDK required. Returns a normalized JSON object.

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || ''
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || process.env.AZURE_OPENAI_API_KEY || ''
// Name of your deployed model, e.g., 'gpt-4o-mini' or your custom deployment name
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || ''
// Stable API version; update if your resource requires a different version
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01'

export function isAOAIConfigured() {
  return Boolean(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY && AZURE_OPENAI_DEPLOYMENT)
}

export async function generateAnswer({
  promptText,
  extractedText,
  subjectHint,
  gradeHint,
  tutorMode = false
}) {
  if (!isAOAIConfigured()) {
    return {
      ok: false,
      reason: 'Azure OpenAI not configured',
    }
  }

  const messages = []
  messages.push({
    role: 'system',
    content: [
      'You are a helpful, concise K–12 tutor called Parent Homework Helper.',
      tutorMode ? 'Use Socratic hints and short step-by-step reasoning tailored to the grade level.' : 'Answer clearly and kindly. Prefer short steps, then a final answer.',
      'If the input contains multiple questions, focus on the main one.',
      'If unsafe or inappropriate for minors, refuse politely.',
      'When math is involved, show brief steps. For reading/writing, include key points or rubric-aligned tips. For science or social studies, define key terms, show short reasoning, and state the final answer.',
      'Return a compact JSON object with fields like answer, steps, explanation, subject, gradeLevel, confidence, and optional citations (array of short quotes). Do not include code fences.'
    ].join(' ')
  })

  const userParts = []
  if (subjectHint) userParts.push(`Subject hint: ${subjectHint}`)
  if (gradeHint) userParts.push(`Grade level hint: ${gradeHint}`)
  if (promptText) userParts.push(`Question: ${promptText}`)
  if (extractedText && extractedText !== promptText) {
    userParts.push('Extracted document text (if helpful):')
    // Limit extremely long docs for safety
    const trimmed = String(extractedText).slice(0, 12000)
    userParts.push(trimmed)
  }

  const userContent = userParts.join('\n\n')

  const body = {
    messages: [
      ...messages,
      { role: 'user', content: userContent }
    ],
    temperature: 0.2,
    max_tokens: 600,
    response_format: { type: 'json_object' }
  }

  const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(AZURE_OPENAI_DEPLOYMENT)}/chat/completions?api-version=${encodeURIComponent(AZURE_OPENAI_API_VERSION)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_KEY
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, reason: `Azure OpenAI error ${res.status}`, details: text }
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || '{}'
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    // Fallback: wrap raw string
    parsed = { answer: content }
  }
  // Normalize a light contract
  const answer = {
    answer: parsed.answer || parsed.finalAnswer || parsed.result || null,
    steps: Array.isArray(parsed.steps) ? parsed.steps : (parsed.steps ? [parsed.steps] : []),
    explanation: parsed.explanation || parsed.reasoning || null,
    subject: parsed.subject || parsed.subjectGuess || subjectHint || null,
    gradeLevel: parsed.gradeLevel || gradeHint || null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
    citations: Array.isArray(parsed.citations) ? parsed.citations : undefined
  }
  return { ok: true, answer, raw: parsed }
}

export default { generateAnswer, isAOAIConfigured }
