// Lightweight Azure Translator client for Functions runtime (Node 18+ fetch)
// Env vars:
// - AZURE_TRANSLATOR_KEY (required)
// - AZURE_TRANSLATOR_ENDPOINT (optional, default https://api.cognitive.microsofttranslator.com)
// - AZURE_TRANSLATOR_REGION (required if using multi-service Cognitive resource)

const TX_KEY = process.env.AZURE_TRANSLATOR_KEY || ''
const TX_ENDPOINT = (process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com').replace(/\/$/, '')
const TX_REGION = process.env.AZURE_TRANSLATOR_REGION || ''

export function isTranslatorConfigured() {
  return Boolean(TX_KEY)
}

export async function translateText({ text, to, from }) {
  if (!isTranslatorConfigured()) {
    return { ok: false, reason: 'Translator not configured' }
  }
  const params = new URLSearchParams({ 'api-version': '3.0', to })
  if (from) params.set('from', from)
  const url = `${TX_ENDPOINT}/translate?${params.toString()}`
  const body = [{ text }]
  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': TX_KEY,
  }
  if (TX_REGION) headers['Ocp-Apim-Subscription-Region'] = TX_REGION
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return { ok: false, reason: `Translator error ${res.status}`, details: t }
  }
  const data = await res.json()
  const translated = data?.[0]?.translations?.[0]?.text || ''
  const detected = data?.[0]?.detectedLanguage?.language || null
  return { ok: true, translated, detected }
}

export default { translateText, isTranslatorConfigured }
