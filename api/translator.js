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
  const confidence = data?.[0]?.detectedLanguage?.score || null
  return { ok: true, translated, detected, confidence }
}

// Detect language of text
export async function detectLanguage(text) {
  if (!isTranslatorConfigured()) return { ok: false, reason: 'Translator not configured' }
  const url = `${TX_ENDPOINT}/detect?api-version=3.0`
  const body = [{ text }]
  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': TX_KEY,
  }
  if (TX_REGION) headers['Ocp-Apim-Subscription-Region'] = TX_REGION
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return { ok: false, reason: `Detect error ${res.status}`, details: t }
  }
  const data = await res.json()
  const language = data?.[0]?.language || null
  const score = data?.[0]?.score || null
  return { ok: true, language, score }
}

// Transliterate between scripts for a given language code. Limited helper with common defaults.
// Example: transliterate({ text: 'こんにちは', language: 'ja', fromScript: 'Jpan', toScript: 'Latn' })
export async function transliterate({ text, language, fromScript, toScript }) {
  if (!isTranslatorConfigured()) return { ok: false, reason: 'Translator not configured' }
  const params = new URLSearchParams({ 'api-version': '3.0', language })
  if (fromScript) params.set('fromScript', fromScript)
  if (toScript) params.set('toScript', toScript)
  const url = `${TX_ENDPOINT}/transliterate?${params.toString()}`
  const body = [{ text }]
  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': TX_KEY,
  }
  if (TX_REGION) headers['Ocp-Apim-Subscription-Region'] = TX_REGION
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return { ok: false, reason: `Transliterate error ${res.status}`, details: t }
  }
  const data = await res.json()
  const textOut = data?.[0]?.text || ''
  return { ok: true, text: textOut }
}

// Convenience: translate with detection and optional transliteration to Latin for non-Latin targets
export async function translateWithDetect({ text, to }) {
  const tx = await translateText({ text, to })
  if (!tx.ok) return tx
  // For certain languages, also provide Latin transliteration for readability in UI
  const needsTranslit = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'ar', 'he', 'hi']
  let translit = null
  if (needsTranslit.includes(to)) {
    const map = {
      'zh-Hans': { fromScript: 'Hans', toScript: 'Latn', language: 'zh-Hans' },
      'zh-Hant': { fromScript: 'Hant', toScript: 'Latn', language: 'zh-Hant' },
      'ja': { fromScript: 'Jpan', toScript: 'Latn', language: 'ja' },
      'ko': { fromScript: 'Kore', toScript: 'Latn', language: 'ko' },
      'ar': { fromScript: 'Arab', toScript: 'Latn', language: 'ar' },
      'he': { fromScript: 'Hebr', toScript: 'Latn', language: 'he' },
      'hi': { fromScript: 'Deva', toScript: 'Latn', language: 'hi' },
    }
    try {
      const tr = await transliterate({ text: tx.translated, ...map[to] })
      if (tr.ok) translit = tr.text
    } catch {}
  }
  return { ...tx, transliteration: translit }
}

export default { translateText, isTranslatorConfigured, detectLanguage, transliterate, translateWithDetect }
