import { app } from "@azure/functions";
import { translateWithDetect, isTranslatorConfigured } from "./translator.js";

async function translateViaAOAI({ text, to }) {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '')
  const key = process.env.AZURE_OPENAI_KEY || process.env.AZURE_OPENAI_API_KEY || ''
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || ''
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01'
  if (!endpoint || !key || !deployment) return { ok: false, reason: 'Azure OpenAI not configured' }
  const messages = [
    { role: 'system', content: 'You are a precise translation engine. Translate the user text into the specified target language. Output only the translated text with no extra words.' },
    { role: 'user', content: `Target language: ${to}\n\nText:\n${text}` }
  ]
  const body = { messages, temperature: 0, max_tokens: 1200 }
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': key }, body: JSON.stringify(body) })
  if (!res.ok) {
    const details = await res.text().catch(() => '')
    return { ok: false, reason: `AOAI error ${res.status}`, details }
  }
  const data = await res.json()
  const translated = data?.choices?.[0]?.message?.content || ''
  return { ok: true, translated, detected: null, confidence: null }
}

// POST /api/translateText
// Body: { text: string, to: string }
// Returns: { translated, transliteration, detected, confidence }
app.http('translateText', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'translateText',
  handler: async (request, context) => {
    try {
      const body = await request.json().catch(() => ({}))
      const text = String(body?.text || '')
      const to = String(body?.to || '')
      if (!text || !to) {
        return { status: 400, jsonBody: { error: 'Missing text or target language' } }
      }
      let res
      if (isTranslatorConfigured()) {
        res = await translateWithDetect({ text, to })
      } else {
        res = await translateViaAOAI({ text, to })
      }
      if (!res.ok) {
        // translator.js returns { ok:false, reason, details? }
        const msg = res.reason || res.error || 'Translation failed'
        return { status: 502, jsonBody: { error: msg, details: res.details } }
      }
      const out = {
        translated: res.translated || null,
        transliteration: res.transliteration || null,
        detected: res.detected || null,
        confidence: res.confidence || null
      }
      return { status: 200, jsonBody: out }
    } catch (err) {
      const message = err?.message || 'Unknown error'
      const details = err?.response?.bodyAsText || err?.response?.status || undefined
      return { status: 500, jsonBody: { error: message, details } }
    }
  }
})

export default {}
