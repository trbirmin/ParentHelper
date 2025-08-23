// Simple ELA helpers: Flesch-Kincaid grade estimate, grammar-lite hints, and vocabulary extraction.
// No external deps; heuristics only.

function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g) || []
}

function countSyllables(word) {
  const w = (word || '').toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  const vowels = 'aeiouy'
  let count = 0
  let prevVowel = false
  for (let i=0;i<w.length;i++) {
    const isVowel = vowels.includes(w[i])
    if (isVowel && !prevVowel) count++
    prevVowel = isVowel
  }
  if (w.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

function fleschKincaid(text) {
  const sentences = splitSentences(text)
  const words = String(text).toLowerCase().match(/[a-zA-Z']+/g) || []
  const syllables = words.reduce((s,w)=> s + countSyllables(w), 0)
  const S = Math.max(1, sentences.length)
  const W = Math.max(1, words.length)
  const L = (words.join('').length / W) * 100 // letters per 100 words
  const ASL = W / S
  const ASW = syllables / W
  // FK grade level approx
  const grade = 0.39 * ASL + 11.8 * ASW - 15.59
  return { grade: Math.round(grade * 10) / 10, sentences: S, words: W }
}

function extractVocabulary(text, max=10) {
  const words = (String(text).toLowerCase().match(/[a-zA-Z']+/g) || [])
  const stop = new Set(['the','a','an','and','or','but','for','nor','so','to','of','in','on','at','by','with','from','as','is','are','be','was','were','it','this','that','these','those','you','we','they','he','she','i'])
  const freq = new Map()
  for (const w of words) {
    if (w.length <= 3 || stop.has(w)) continue
    freq.set(w, (freq.get(w)||0)+1)
  }
  const sorted = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,max).map(([w,c])=>({word:w,count:c}))
  return sorted
}

export function analyzeELA(text) {
  const fk = fleschKincaid(text)
  const vocab = extractVocabulary(text, 12)
  // Very small grammar suggestions: too-long sentences
  const sentences = splitSentences(text)
  const long = sentences.filter(s => s.split(/\s+/).length > 30)
  const suggestions = []
  if (long.length) suggestions.push('Consider splitting very long sentences for clarity.')
  return { ok: true, subject: 'ela', readingLevel: fk.grade, vocab, suggestions }
}

export default { analyzeELA }
