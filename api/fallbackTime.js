// Fallback time answer for questions like "what time is it in Orlando?"

function norm(s = '') { return String(s).toLowerCase().trim() }

// Minimal city -> IANA time zone map (expand as needed)
const cityToTz = {
  // US
  'orlando': 'America/New_York',
  'new york': 'America/New_York',
  'miami': 'America/New_York',
  'boston': 'America/New_York',
  'atlanta': 'America/New_York',
  'washington': 'America/New_York',
  'dc': 'America/New_York',
  'chicago': 'America/Chicago',
  'houston': 'America/Chicago',
  'dallas': 'America/Chicago',
  'denver': 'America/Denver',
  'phoenix': 'America/Phoenix',
  'los angeles': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  'seattle': 'America/Los_Angeles',
  // Europe
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'berlin': 'Europe/Berlin',
  'madrid': 'Europe/Madrid',
  'rome': 'Europe/Rome',
  // Middle East / Asia / Oceania
  'dubai': 'Asia/Dubai',
  'tokyo': 'Asia/Tokyo',
  'singapore': 'Asia/Singapore',
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne'
}

function extractPlace(question = '') {
  const q = question.toLowerCase()
  // common patterns
  const patts = [
    /what\s+time\s+is\s+it\s+in\s+([^\?\.,!]+)/i,
    /current\s+time\s+in\s+([^\?\.,!]+)/i,
    /time\s+in\s+([^\?\.,!]+)/i,
  ]
  for (const p of patts) {
    const m = p.exec(question)
    if (m && m[1]) return m[1].replace(/\s+/g, ' ').trim()
  }
  return null
}

export function getTimeAnswer(question = '') {
  const placeRaw = extractPlace(question)
  if (!placeRaw) return { ok: false }
  const place = placeRaw.replace(/,?\s*fl(,|orida)?\.?$/i, ' orlando') // simple Orlando hint
  const key = norm(place)
  // try exact, then basic cleanup
  const tz = cityToTz[key] || cityToTz[key.replace(/,.*$/, '')]
  if (!tz) return { ok: false }
  try {
    const now = new Date()
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      timeZoneName: 'short'
    })
    const formatted = fmt.format(now)
    return {
      ok: true,
      subject: 'general',
      answer: formatted,
      explanation: `Local time in ${placeRaw} (${tz}).`
    }
  } catch {
    return { ok: false }
  }
}

export default { getTimeAnswer }
