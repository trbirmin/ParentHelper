// processText: accepts a typed question payload, optionally splits multiple items,
// answers via Azure OpenAI when configured or falls back to math/definitions/time,
// and can translate the final answer when the prompt asks for another language.
import { app } from "@azure/functions";
import { solveFromText } from "./mathSolver.js";
import { getDefinition } from "./fallbackDefinitions.js";
import { generateAnswer, isAOAIConfigured } from "./aiAnswer.js";
import { getTimeAnswer } from "./fallbackTime.js";
import { translateText, isTranslatorConfigured, translateWithDetect } from "./translator.js";
import { analyzeELA } from "./fallbackELA.js";

app.http('processText', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processText',
  handler: async (request, context) => {
    try {
      const body = await request.json().catch(() => ({}));
      const question = body?.question || 'No question provided';
      const subjectHint = body?.subject
      const gradeHint = body?.grade
      const tutorMode = body?.tutorMode ? true : false
      const reqTargetLang = body?.targetLang
      const solution = solveFromText(question)

    const splitQuestions = (text) => {
      const raw = String(text)
      // First, try enumerated blocks 1., 2., 3.
      const lines = raw.split(/\r?\n/)
      const isEnumLine = (l) => /^\s*(\(?\d{1,3}[).]|\d{1,3}\.)\s+/.test(l)
      const stripEnum = (s='') => s.replace(/^\s*(\(?\d{1,3}[).]|\d{1,3}\.)\s+/, '').trim()
      const blocks = []
      let cur = []
      for (const line of lines) {
        if (isEnumLine(line)) {
          if (cur.length) blocks.push(cur.join('\n').trim())
          cur = [stripEnum(line)]
        } else {
          if (cur.length) cur.push(line.trim())
        }
      }
      if (cur.length) blocks.push(cur.join('\n').trim())
      const pick = (block) => {
        const ll = block.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
        const q = ll.find(s=>/\?\s*$/.test(s))
        if (q) return q.slice(0,300)
        const sent = String(block).split(/(?<=[\.\?\!])\s+/).find(s=>s.length<=300)
        if (sent) return sent.trim()
        if (ll.length) return ll.sort((a,b)=>a.length-b.length)[0].slice(0,300)
        return String(block).slice(0,300)
      }
      let qs = []
      if (blocks.length >= 2) qs = blocks.slice(0,5).map(pick).filter(Boolean)
      if (qs.length === 0) {
        // Fallback: split by question marks across lines
        const parts = raw.split(/\r?\n+/).map(s=>s.trim()).filter(Boolean)
        for (const p of parts) {
          const segs = p.split(/\?\s+/)
          for (let i=0;i<segs.length;i++){
            let seg = segs[i].trim()
            if (!seg) continue
            if (i < segs.length - 1) seg += '?'
            if (seg.length <= 300) qs.push(seg)
          }
        }
      }
      return qs.length ? qs.slice(0,5) : [raw.slice(0,300)]
    }

    const items = splitQuestions(question)

    const norm = (s='') => String(s).toLowerCase().replace(/\s+/g,' ').replace(/[\p{P}\p{S}]/gu,'').trim()
    const isEchoOf = (text, q) => {
      if (!text || !q) return false
      const a = norm(text)
      const b = norm(q)
      if (!a || !b) return false
      if (a === b) return true
      // Consider echo if one contains the other and shorter is >= 0.8 of longer
      const shorter = a.length <= b.length ? a : b
      const longer = a.length > b.length ? a : b
      return longer.includes(shorter) && shorter.length / longer.length >= 0.8
    }

    const buildItem = async (qLine) => {
      // Simple target language detection: phrases like "in French", "in Spanish", or explicit code like "-> fr"
      const langMap = {
        french: 'fr', fr: 'fr',
        spanish: 'es', es: 'es',
        german: 'de', de: 'de',
        italian: 'it', it: 'it',
        portuguese: 'pt', pt: 'pt',
        chinese: 'zh-Hans', 'zh': 'zh-Hans',
        japanese: 'ja', ja: 'ja',
        korean: 'ko', ko: 'ko',
        arabic: 'ar', ar: 'ar'
      }
      let targetLang = null
      const lower = qLine.toLowerCase()
      const mArrow = lower.match(/->\s*([a-z-]{2,8})\b/)
      if (mArrow && langMap[mArrow[1]]) targetLang = langMap[mArrow[1]]
      if (!targetLang) {
        const mIn = lower.match(/\b(?:in|to)\s+(french|spanish|german|italian|portuguese|chinese|japanese|korean|arabic|fr|es|de|it|pt|zh|ja|ko|ar)\b/)
        if (mIn && langMap[mIn[1]]) targetLang = langMap[mIn[1]]
      }

    let ai = null
      if (isAOAIConfigured()) {
        ai = await generateAnswer({
          promptText: qLine,
          extractedText: undefined,
      subjectHint,
      gradeHint,
      tutorMode
        })
      }
      const mathTry = solveFromText(qLine)
      let subj = subjectHint || (ai?.ok && (ai.answer.subject || null)) || (mathTry.success ? 'math' : null)
      let ans = (ai?.ok && (ai.answer.answer ?? null)) || (mathTry.success ? String(mathTry.result) : null)
      let steps = (ai?.ok && Array.isArray(ai.answer.steps) ? ai.answer.steps : []) || (mathTry.success ? mathTry.steps : [])
      let expl = (ai?.ok && (ai.answer.explanation || (steps.length ? steps.join(' -> ') : null))) || (mathTry.success ? mathTry.steps.join(' | ') : null)
      // If the explanation merely repeats the question, prefer steps or leave empty
      if (expl && isEchoOf(expl, qLine)) {
        expl = steps && steps.length ? steps.join(' -> ') : null
      }
      if (!ans && !expl) {
        const def = getDefinition(qLine)
        if (def.ok) {
          subj = subj || def.subject
          ans = def.answer
          expl = def.explanation
        }
        if (!ans && !expl) {
          const t = getTimeAnswer(qLine)
          if (t.ok) {
            subj = subj || t.subject
            ans = t.answer
            expl = t.explanation
          }
        }
      }

      // If no general answer, consider ELA helpers ONLY when the user asks for ELA-type analysis
      const isELAIntent = (s = '') => /\b(reading\s+level|grade\s+level|readability|vocabulary|key\s+vocabulary|grammar|revise|rewrite|paraphrase|summarize\s+this\s+text|parts\s+of\s+speech|nouns?|verbs?|adjectives?|adverbs?)\b/i.test(String(s))
      if (!ans && !expl && /[a-zA-Z]/.test(qLine) && (subjectHint === 'ela' || isELAIntent(qLine))) {
        const ela = analyzeELA(qLine)
        if (ela.ok) {
          subj = subj || ela.subject
          ans = `Estimated reading level: grade ${ela.readingLevel}`
          const vocabStr = ela.vocab.length ? `Key vocabulary: ${ela.vocab.map(v=>v.word).join(', ')}` : ''
          const sugStr = ela.suggestions.length ? `Suggestions: ${ela.suggestions.join(' ')}` : ''
          expl = [vocabStr, sugStr].filter(Boolean).join('\n')
        }
      }

      const originalAnswer = ans || null
      let translation = null
      let translationTransliteration = null
      let translationDetectedLang = null
      let translationConfidence = null
      // If a target language is present and Translator is configured, translate the final answer
      const finalTarget = reqTargetLang || targetLang
      if (finalTarget && (ans || expl) && isTranslatorConfigured()) {
        try {
          const base = ans || expl || ''
          const tx = await translateWithDetect({ text: base, to: finalTarget })
          if (tx.ok && tx.translated) {
            if (ans) {
              const extra = tx.transliteration ? `${ans} (${tx.transliteration})` : ans
              expl = expl ? `${expl}\n\n(${extra} in ${finalTarget})` : `(${extra} in ${finalTarget})`
            }
            translation = tx.translated
            translationTransliteration = tx.transliteration || null
            translationDetectedLang = tx.detected || null
            translationConfidence = tx.confidence || null
            subj = subj || 'translation'
          }
        } catch {}
      }
  return { subject: subj, problem: qLine, answer: ans, explanation: expl, steps, originalAnswer, translation, translationTransliteration, translationDetectedLang, translationConfidence }
    }

      if (items.length > 1) {
        const out = []
        for (const q of items) { out.push(await buildItem(q)) }
        return { status: 200, jsonBody: { items: out } }
      } else {
        const one = await buildItem(items[0])
        return { status: 200, jsonBody: one }
      }
    } catch (err) {
      const message = err?.message || 'Unknown error'
      const details = err?.response?.bodyAsText || err?.response?.status || undefined
      return { status: 500, jsonBody: { error: message, details } }
    }
  }
});
