// processImage: accepts a single image (camera/file), runs Document Intelligence
// prebuilt-document OCR, extracts question-like prompts (favoring math),
// and answers via Azure OpenAI or local fallbacks, optionally translating the output.
import { app } from "@azure/functions";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { solveFromText } from "./mathSolver.js";
import { getDefinition } from "./fallbackDefinitions.js";
import { getTimeAnswer } from "./fallbackTime.js";
import { generateAnswer, isAOAIConfigured } from "./aiAnswer.js";
import { translateText, isTranslatorConfigured, translateWithDetect } from "./translator.js";

app.http('processImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processImage',
  handler: async (request, context) => {
    try {
      const contentType = request.headers.get('content-type') || ''
      let file
      let subjectHint, gradeHint, tutorMode, reqTargetLang
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        file = formData.get('image') || formData.get('file')
        subjectHint = formData.get('subject') || undefined
        gradeHint = formData.get('grade') || undefined
        tutorMode = formData.get('tutorMode') ? true : false
        reqTargetLang = formData.get('targetLang') || undefined
      } else {
        const body = await request.json().catch(() => ({}))
        if (body?.base64) {
          const bytes = Buffer.from(body.base64, 'base64')
          file = new File([bytes], body.filename || 'camera.jpg', { type: body.contentType || 'image/jpeg' })
        }
        subjectHint = body?.subject
        gradeHint = body?.grade
        tutorMode = body?.tutorMode ? true : false
        reqTargetLang = body?.targetLang
      }

      if (!file) return { status: 400, jsonBody: { error: 'No image provided' } }

      const endpoint = process.env.AZURE_DOCINTEL_ENDPOINT
      const key = process.env.AZURE_DOCINTEL_KEY
      if (!endpoint || !key) return { status: 500, jsonBody: { error: 'Missing AZURE_DOCINTEL_ENDPOINT or AZURE_DOCINTEL_KEY' } }

      const supported = ['image/png','image/jpeg','image/jpg','image/tiff','image/bmp']
      const detectedType = file.type || (file.name?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
      if (!supported.includes(detectedType)) {
        // attempt anyway; DI often accepts when declared as octet-stream
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key))
      const poller = await client.beginAnalyzeDocument('prebuilt-document', buffer, { contentType: detectedType })
  const result = await poller.pollUntilDone()
      const fullText = result.content || ''
  const hasHandwriting = Array.isArray(result.styles) ? result.styles.some(s => s.isHandwritten) : false

      // Use the same question extraction strategy as uploadFile by importing heuristics locally
      const normalizeSpace = (s='') => String(s).replace(/\s+/g, ' ').trim()
      const stripBullet = (s = '') => s
        .replace(/^\s*[•·▪◦\-–—]\s+/, '')
        .replace(/^\s*\(?\d+[).]\s+/, '')
        .replace(/^\s*\(?[A-Za-z][).]\s+/, '')
        .replace(/^\s*[\.:]+\s+/, '')
      const mathHead = /(simplify(?: the)? fractions?|find the product|find the sum|find the difference|find the quotient|solve|evaluate)/i
      const fracTokenG = /\b(\d+)\s*[⁄\/]\s*(\d+)\b/g
      const opExprTokenG = /([-+]?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*([-+]?\d+(?:\.\d+)?)/g

      const lines = String(fullText).split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
      let lastHead = ''
      const questions = []
      for (const l0 of lines) {
        const l = stripBullet(l0)
        if (mathHead.test(l)) { lastHead = l; continue }
        let matched = false
        for (const m of l.matchAll(fracTokenG)) {
          matched = true
          const expr = `${m[1]}/${m[2]} =`
          questions.push((lastHead ? `${lastHead} ${expr}` : expr).slice(0,300))
        }
        for (const m of l.matchAll(opExprTokenG)) {
          matched = true
          const op = m[2] === 'x' ? '*' : (m[2] === '×' ? '*' : (m[2] === '÷' ? '/' : m[2]))
          const expr = `${m[1]}${op}${m[3]} =`
          questions.push((lastHead ? `${lastHead} ${expr}` : expr).slice(0,300))
        }
        if (!matched && /[?]/.test(l)) questions.push(l.slice(0,300))
      }

      // Fallback to a single shortest mathy line if nothing found
      const picked = questions.length ? questions : [normalizeSpace(fullText).slice(0,300)]

      const norm = (s='') => String(s).toLowerCase().replace(/\s+/g,' ').replace(/[\p{P}\p{S}]/gu,'').trim()
      const isEchoOf = (text, q) => {
        if (!text || !q) return false
        const a = norm(text)
        const b = norm(q)
        if (!a || !b) return false
        if (a === b) return true
        const shorter = a.length <= b.length ? a : b
        const longer = a.length > b.length ? a : b
        return longer.includes(shorter) && shorter.length / longer.length >= 0.8
      }

      const buildItem = async (problemLine) => {
        const lower = String(problemLine || '').toLowerCase()
        const langMap = { french:'fr', fr:'fr', spanish:'es', es:'es', german:'de', de:'de', italian:'it', it:'it', portuguese:'pt', pt:'pt', chinese:'zh-Hans', zh:'zh-Hans', japanese:'ja', ja:'ja', korean:'ko', ko:'ko', arabic:'ar', ar:'ar' }
        let targetLang = null
        const mArrow = lower.match(/->\s*([a-z-]{2,8})\b/)
        if (mArrow && langMap[mArrow[1]]) targetLang = langMap[mArrow[1]]
        if (!targetLang) {
          const mIn = lower.match(/\b(?:in|to)\s+(french|spanish|german|italian|portuguese|chinese|japanese|korean|arabic|fr|es|de|it|pt|zh|ja|ko|ar)\b/)
          if (mIn && langMap[mIn[1]]) targetLang = langMap[mIn[1]]
        }
        const findExpression = (s='') => {
          const text = String(s)
          const frac = text.match(/\b\d+\s*[⁄\/]\s*\d+\b/)
          if (frac) return frac[0]
          const op = text.match(/[-+]?\d+(?:\.\d+)?\s*([+\-*/x×÷])\s*[-+]?\d+(?:\.\d+)?/)
          if (op) {
            return op[0].replace(/x|×/g,'*').replace(/÷/g,'/')
          }
          return null
        }
        let ai = null
        if (isAOAIConfigured()) {
          ai = await generateAnswer({ promptText: problemLine, extractedText: undefined, subjectHint, gradeHint, tutorMode })
        }
  const exprOnly = findExpression(problemLine)
  const mathTry = solveFromText(exprOnly || problemLine)
  let subj = subjectHint || (ai?.ok && (ai.answer.subject || null)) || (mathTry.success ? 'math' : null)
  let ans = (ai?.ok && (ai.answer.answer ?? null)) || (mathTry.success ? String(mathTry.result) : null)
  let steps = (ai?.ok && Array.isArray(ai.answer.steps) ? ai.answer.steps : []) || (mathTry.success ? mathTry.steps : [])
  let expl = (ai?.ok && (ai.answer.explanation || (steps.length ? steps.join(' -> ') : null))) || (mathTry.success ? mathTry.steps.join(' | ') : null)
        if (expl && isEchoOf(expl, problemLine)) {
          expl = steps && steps.length ? steps.join(' -> ') : null
        }
        if (!ans && !expl) {
          const def = getDefinition(problemLine)
          if (def.ok) {
            subj = subj || def.subject
            ans = def.answer
            expl = def.explanation
          }
          if (!ans && !expl) {
            const t = getTimeAnswer(problemLine)
            if (t.ok) {
              subj = subj || t.subject
              ans = t.answer
              expl = t.explanation
            }
          }
        }
        const originalAnswer = ans || null
        let translation = null
        let translationTransliteration = null
        let translationDetectedLang = null
        let translationConfidence = null
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
  // No table build here (single image); propagate handwriting flag
  return { subject: subj, problem: problemLine, answer: ans, explanation: expl, steps, originalAnswer, translation, translationTransliteration, translationDetectedLang, translationConfidence, handwriting: hasHandwriting }
      }

      if (picked.length > 1) {
        const items = []
        for (const q of picked.slice(0,10)) items.push(await buildItem(q))
        return { status: 200, jsonBody: { items } }
      } else {
        const single = await buildItem(picked[0])
        return { status: 200, jsonBody: single }
      }
    } catch (err) {
      const message = err?.message || 'Unknown error'
      const details = err?.response?.bodyAsText || err?.response?.status || undefined
      return { status: 500, jsonBody: { error: message, details } }
    }
  }
});
