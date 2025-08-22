import { app } from "@azure/functions";
import { solveFromText } from "./mathSolver.js";
import { getDefinition } from "./fallbackDefinitions.js";
import { generateAnswer, isAOAIConfigured } from "./aiAnswer.js";
import { getTimeAnswer } from "./fallbackTime.js";

app.http('processText', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processText',
  handler: async (request, context) => {
    const body = await request.json().catch(() => ({}));
    const question = body?.question || 'No question provided';
    const subjectHint = body?.subject
    const gradeHint = body?.grade
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

    const buildItem = async (qLine) => {
      let ai = null
      if (isAOAIConfigured()) {
        ai = await generateAnswer({
          promptText: qLine,
          extractedText: undefined,
          subjectHint,
          gradeHint
        })
      }
      const mathTry = solveFromText(qLine)
      let subj = subjectHint || (ai?.ok && (ai.answer.subject || null)) || (mathTry.success ? 'math' : null)
      let ans = (ai?.ok && (ai.answer.answer ?? null)) || (mathTry.success ? String(mathTry.result) : null)
      let expl = (ai?.ok && (ai.answer.explanation || (Array.isArray(ai.answer.steps) ? ai.answer.steps.join(' -> ') : null))) || (mathTry.success ? mathTry.steps.join(' | ') : null)
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
      return { subject: subj, problem: qLine, answer: ans, explanation: expl }
    }

    if (items.length > 1) {
      const out = []
      for (const q of items) { out.push(await buildItem(q)) }
      return { status: 200, jsonBody: { items: out } }
    } else {
      const one = await buildItem(items[0])
      return { status: 200, jsonBody: one }
    }
  }
});
