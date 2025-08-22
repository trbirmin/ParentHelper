import { app } from "@azure/functions";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { solveFromText } from "./mathSolver.js";
import { getDefinition } from "./fallbackDefinitions.js";
import { getTimeAnswer } from "./fallbackTime.js";
import { generateAnswer, isAOAIConfigured } from "./aiAnswer.js";

app.http('processImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processImage',
  handler: async (request, context) => {
    try {
      const contentType = request.headers.get('content-type') || ''
      let file
      let subjectHint, gradeHint
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        file = formData.get('image') || formData.get('file')
        subjectHint = formData.get('subject') || undefined
        gradeHint = formData.get('grade') || undefined
      } else {
        const body = await request.json().catch(() => ({}))
        if (body?.base64) {
          const bytes = Buffer.from(body.base64, 'base64')
          file = new File([bytes], body.filename || 'camera.jpg', { type: body.contentType || 'image/jpeg' })
        }
        subjectHint = body?.subject
        gradeHint = body?.grade
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

      const buildItem = async (problemLine) => {
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
          ai = await generateAnswer({ promptText: problemLine, extractedText: undefined, subjectHint, gradeHint })
        }
        const exprOnly = findExpression(problemLine)
        const mathTry = solveFromText(exprOnly || problemLine)
        let subj = subjectHint || (ai?.ok && (ai.answer.subject || null)) || (mathTry.success ? 'math' : null)
        let ans = (ai?.ok && (ai.answer.answer ?? null)) || (mathTry.success ? String(mathTry.result) : null)
        let expl = (ai?.ok && (ai.answer.explanation || (Array.isArray(ai.answer.steps) ? ai.answer.steps.join(' -> ') : null))) || (mathTry.success ? mathTry.steps.join(' | ') : null)
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
        return { subject: subj, problem: problemLine, answer: ans, explanation: expl }
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
