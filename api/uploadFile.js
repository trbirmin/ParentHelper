import { app } from "@azure/functions";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { solveFromText } from "./mathSolver.js";
import { getDefinition } from "./fallbackDefinitions.js";
import { getTimeAnswer } from "./fallbackTime.js";
import { generateAnswer, isAOAIConfigured } from "./aiAnswer.js";

const endpoint = process.env.AZURE_DOCINTEL_ENDPOINT
const key = process.env.AZURE_DOCINTEL_KEY

app.http('uploadFile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'uploadFile',
  handler: async (request, context) => {
    try {
      const contentType = request.headers.get('content-type') || ''
      let file
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        file = formData.get('file') || formData.get('image')
        // Optional hints from the client
        var subjectHint = formData.get('subject') || undefined
        var gradeHint = formData.get('grade') || undefined
        var maxItems = parseInt(formData.get('maxItems') || '20', 10)
      } else {
        // Allow JSON with { base64, filename }
        const body = await request.json().catch(() => ({}))
        if (body?.base64) {
          const bytes = Buffer.from(body.base64, 'base64')
          file = new File([bytes], body.filename || 'upload.bin', { type: body.contentType || 'application/octet-stream' })
        }
        var subjectHint = body?.subject || undefined
        var gradeHint = body?.grade || undefined
        var maxItems = parseInt((body && body.maxItems) ? String(body.maxItems) : '20', 10)
      }

      if (!file) {
        return { status: 400, jsonBody: { error: 'No file provided' } }
      }

      if (typeof file.size === 'number' && file.size === 0) {
        return { status: 400, jsonBody: { error: 'Empty file' } }
      }

      if (!endpoint || !key) {
        return { status: 500, jsonBody: { error: 'Missing AZURE_DOCINTEL_ENDPOINT or AZURE_DOCINTEL_KEY' } }
      }

      // Supported by Document Intelligence (prebuilt-document): PDF, images (JPEG/JPG, PNG, TIFF, BMP)
      const supportedExt = ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp']
      const unsupportedDocExt = ['.doc', '.docx']
      const unsupportedImageExt = ['.heic', '.heif']

      // Derive a content type for the SDK (helps with Office docs)
      let detectedType = file.type || 'application/octet-stream'
      const nameLower = (file.name || '').toLowerCase()
      if (!file.type && nameLower.endsWith('.pdf')) detectedType = 'application/pdf'
      else if (!file.type && nameLower.endsWith('.png')) detectedType = 'image/png'
      else if (!file.type && (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg'))) detectedType = 'image/jpeg'
      else if (!file.type && (nameLower.endsWith('.tif') || nameLower.endsWith('.tiff'))) detectedType = 'image/tiff'

      // Early validation: give a clear message for known unsupported formats
      if (unsupportedDocExt.some(ext => nameLower.endsWith(ext))) {
        return {
          status: 415,
          jsonBody: {
            error: 'Unsupported format for Document Intelligence',
            details: 'Word documents (.doc/.docx) are not supported by the prebuilt-document model locally. Please convert to PDF or upload an image (JPG/PNG/TIFF/BMP).'
          }
        }
      }
      if (unsupportedImageExt.some(ext => nameLower.endsWith(ext)) || detectedType === 'image/heic' || detectedType === 'image/heif') {
        return {
          status: 415,
          jsonBody: {
            error: 'Unsupported image format',
            details: 'HEIC/HEIF images are not supported. Please change camera settings to JPEG or convert the image to JPG/PNG/TIFF.'
          }
        }
      }
      if (!supportedExt.some(ext => nameLower.endsWith(ext))) {
        // If extension unclear, still attempt but warn client
        // Optionally, you can uncomment to hard-block unknown formats
        // return { status: 415, jsonBody: { error: 'Unsupported file format', details: 'Use PDF or images (JPG/PNG/TIFF/BMP).' } }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key))

      // Use the prebuilt-document model to extract text and structure
      const poller = await client.beginAnalyzeDocument('prebuilt-document', buffer, { contentType: detectedType })
      const result = await poller.pollUntilDone()

  const pages = (result.pages || []).map(p => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        unit: p.unit
      }))
  const paragraphs = (result.paragraphs || []).map(pg => ({ role: pg.role, content: pg.content }))
      const tables = (result.tables || []).map(t => ({
        rowCount: t.rowCount,
        columnCount: t.columnCount,
        cells: t.cells?.map(c => ({ rowIndex: c.rowIndex, columnIndex: c.columnIndex, content: c.content }))
      }))

      // Try to compute an answer from extracted content (basic arithmetic only)
      const fullText = result.content || ''
      const solution = solveFromText(fullText)

      // If Azure OpenAI is configured, generate a subject-agnostic explanation/answer
      let ai = null
      if (isAOAIConfigured()) {
        ai = await generateAnswer({
          promptText: undefined,
          extractedText: fullText,
          subjectHint,
          gradeHint
        })
      }

      // Helpers to extract multiple questions
      const normalizeSpace = (s='') => String(s).replace(/\s+/g, ' ').trim()
      const isIgnorableRole = (role) => ['pageNumber','pageHeader','pageFooter','footnote'].includes(role || '')
      const isQuestionLike = (s='') => {
        const t = s.trim()
        if (!t) return false
        if (/\?\s*$/.test(t)) return true
        return /(explain|describe|define|summarize|choose|select|write|compute|solve|calculate|evaluate|simplify|find|identify|label|compare|contrast|true or false|tick the|circle the|which|what|when|where|who|how|why)\b/i.test(t)
      }
      const splitSentences = (s='') => {
        // Split on sentence boundaries; keep short segments
        return String(s)
          .split(/(?<=[\.\?\!])\s+/)
          .map(x => x.trim())
          .filter(Boolean)
      }
      const stripBullet = (s = '') => s
        .replace(/^\s*[•·▪◦\-–—]\s+/, '')
        .replace(/^\s*\(?\d+[).]\s+/, '')
        .replace(/^\s*\(?[A-Za-z][).]\s+/, '')
        .replace(/^\s*[\.\:]+\s+/, '')
      const extractQuestions = (text) => {
        const lines = String(text).split(/\r?\n/).map(l => stripBullet(l.trim())).filter(Boolean)
        // Take lines that look like questions or short prompts; cap length to avoid paragraphs
        const qs = lines.filter(l => (l.endsWith('?') || /\?\s*$/.test(l) || isQuestionLike(l)) && l.length <= 300)
        // If none match strict pattern, fallback to up to first 3 shortest lines containing a verb
        if (qs.length === 0) {
          const alt = lines.filter(l => /\b(is|are|does|do|explain|why|how|what|when|where|which)\b/i.test(l))
            .sort((a,b)=>a.length-b.length).slice(0,3)
          return alt
        }
        return qs.slice(0, 5)
      }

      // Split enumerated blocks (1., 2., 3.) into separate questions when present
      const splitEnumeratedBlocks = (text) => {
        const rawLines = String(text).split(/\r?\n/)
        const isEnumLine = (l) => /^\s*(\(?\d{1,3}[).]|\d{1,3}\.)\s+/.test(l)
        const stripBulletFull = (s='') => s
          .replace(/^\s*(\(?\d{1,3}[).]|\d{1,3}\.)\s+/, '')
          .trim()
        const blocks = []
        let cur = []
        for (const line of rawLines) {
          if (isEnumLine(line)) {
            if (cur.length) blocks.push(cur.join('\n').trim())
            cur = [stripBulletFull(line)]
          } else {
            if (cur.length) cur.push(line.trim())
          }
        }
        if (cur.length) blocks.push(cur.join('\n').trim())
        return blocks.filter(Boolean)
      }

      const derivePromptFromBlock = (block) => {
        if (!block) return ''
        // If the block contains a math heading and an expression, combine them as a single concise prompt.
        const lines = block.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
        const headRe = /(simplify(?: the)? fractions?|find the product|find the sum|find the difference|find the quotient|solve|evaluate)/i
        const fracToken = /\b(\d+)\s*[⁄\/]\s*(\d+)\b/
        const opExprToken = /([-+]?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*([-+]?\d+(?:\.\d+)?)/
        const headLine = lines.find(l => headRe.test(l))
        const exprLine = lines.find(l => fracToken.test(l) || opExprToken.test(l))
        if (headLine && exprLine) {
          const m1 = exprLine.match(fracToken)
          const m2 = exprLine.match(opExprToken)
          if (m1) return `${headLine} ${m1[0]} =`.slice(0,300)
          if (m2) {
            const op = m2[2] === 'x' ? '*' : (m2[2] === '×' ? '*' : (m2[2] === '÷' ? '/' : m2[2]))
            return `${headLine} ${m2[1]}${op}${m2[3]} =`.slice(0,300)
          }
        }
        // Otherwise prefer a line that ends with a question mark
        const qLine = lines.find(l => /\?\s*$/.test(l))
        if (qLine) return qLine.slice(0, 300)
        // Else pick the first short sentence
        const sentence = String(block).split(/(?<=[\.?\!])\s+/).find(s => s.length <= 300)
        if (sentence) return sentence.trim()
        // Else pick the shortest line
        if (lines.length) return lines.sort((a,b)=>a.length-b.length)[0].slice(0,300)
        return String(block).slice(0,300)
      }

      // Build candidates from paragraphs first (best signal for wrapped questions)
      const paraCandidates = []
      for (const pg of paragraphs) {
        if (!pg || isIgnorableRole(pg.role)) continue
        const ptext = normalizeSpace(pg.content || '')
        if (!ptext) continue
        const sentences = splitSentences(ptext)
        for (const sent of sentences) {
          const s = normalizeSpace(stripBullet(sent))
          if (s && s.length <= 300 && isQuestionLike(s)) paraCandidates.push(s)
        }
        // If no sentence-level match, consider the paragraph itself if short enough and looks like a prompt
        if (!paraCandidates.length) {
          if (ptext.length <= 300 && isQuestionLike(ptext)) paraCandidates.push(ptext)
        }
      }

      // Also consider enumerated blocks and line-based fallbacks, plus math-style lines
      const extractMathFromLines = (text) => {
        const raw = String(text)
        const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
        const mathHead = /(simplify(?: the)? fractions?|find the product|find the sum|find the difference|find the quotient|solve|evaluate|add parentheses|write two expressions|write in|compare|sum|difference|product|quotient)/i
        // Individual expression matchers (global)
        const fracToken = /\b(\d+)\s*[⁄\/]\s*(\d+)\b/g
        const opExprToken = /([-+]?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*([-+]?\d+(?:\.\d+)?)/g
        const results = []
        let lastHead = ''
        for (const l0 of lines) {
          const l = stripBullet(l0)
          if (mathHead.test(l)) { lastHead = l; continue }
          if (/(Monday|Tuesday|Wednesday|Thursday|Friday)/i.test(l)) { lastHead = ''; continue }
          // Capture multiple fraction tokens in a single line
          let matched = false
          for (const m of l.matchAll(fracToken)) {
            matched = true
            const expr = `${m[1]}/${m[2]} =`
            const combined = lastHead ? `${lastHead} ${expr}` : expr
            results.push(combined.slice(0, 300))
          }
          // Capture inline operator expressions (e.g., 1.45*3.8)
          for (const m of l.matchAll(opExprToken)) {
            matched = true
            const op = m[2] === 'x' ? '*' : (m[2] === '×' ? '*' : (m[2] === '÷' ? '/' : m[2]))
            const expr = `${m[1]}${op}${m[3]} =`
            const combined = lastHead ? `${lastHead} ${expr}` : expr
            results.push(combined.slice(0, 300))
          }
          // If still not matched but line looks mathy (equals or blanks), include as-is
          if (!matched && /[=]|_{2,}/.test(l)) {
            const combined = lastHead ? `${lastHead} ${l}` : l
            results.push(combined.slice(0, 300))
          }
        }
        return results
      }
      let questions = []
      const blocks = splitEnumeratedBlocks(fullText)
      const enumeratedMode = blocks.length >= 2
      if (enumeratedMode) {
        // One prompt per enumerated block
        questions = blocks.map(derivePromptFromBlock).filter(Boolean)
      }
      // Merge: paragraphs -> enumerated -> line-based
      const lineFallback = extractQuestions(fullText)
      // Extract layout lines to reconstruct stacked fractions (numerator over denominator)
      const fractionPairsFromLayout = (() => {
        const out = []
        const mathHead = /(simplify|find the product|find the sum|find the difference|find the quotient|solve|add parentheses|write two expressions|write in|compare|sum|difference|product|quotient)/i
        const pagesArr = Array.isArray(result.pages) ? result.pages : []
        for (const page of pagesArr) {
          const linesArr = Array.isArray(page.lines) ? page.lines : []
          const lines = linesArr.map(l => {
            const poly = Array.isArray(l.polygon) ? l.polygon : []
            const xs = poly.filter((_,i)=>i%2===0)
            const ys = poly.filter((_,i)=>i%2===1)
            const xMin = xs.length ? Math.min(...xs) : 0
            const xMax = xs.length ? Math.max(...xs) : 0
            const yMin = ys.length ? Math.min(...ys) : 0
            const yMax = ys.length ? Math.max(...ys) : 0
            return { text: (l.content || '').trim(), xMin, xMax, yMin, yMax }
          }).filter(l => l.text)
            .sort((a,b)=> a.yMin - b.yMin || a.xMin - b.xMin)

          const width = page.width || 100
          const height = page.height || 100
          const xTol = width * 0.06
          const yGapMax = height * 0.15
          let lastHead = ''
          for (let i=0;i<lines.length;i++){
            const li = lines[i]
            const txt = stripBullet(li.text)
            if (mathHead.test(txt)) { lastHead = txt; continue }
            // numerator candidate: a short integer-only line
            if (/^\d{1,4}$/.test(txt)) {
              let best = null
              for (let j=i+1;j<lines.length;j++){
                const lj = lines[j]
                const dx = Math.abs(((li.xMin+li.xMax)/2) - ((lj.xMin+lj.xMax)/2))
                const dy = lj.yMin - li.yMax
                if (dy < -yTol(height)) continue
                if (dy > yGapMax) break
                if (!/^\d{1,4}$/.test(stripBullet(lj.text))) continue
                if (dx <= xTol) { best = lj; break }
              }
              if (best) {
                const combined = `${lastHead ? lastHead + ' ' : ''}${txt}/${stripBullet(best.text)} =`
                out.push(combined.slice(0,300))
              }
            }
          }
        }
        return out
      })()

      function yTol(h){ return Math.max(0.01*h, 2) }

      const mathFromLines = extractMathFromLines(fullText)
      // If enumerated blocks exist, use only those to avoid splitting one numbered block into multiple items.
      const merged = enumeratedMode
        ? [...questions]
        : [
            ...fractionPairsFromLayout,
            ...mathFromLines,
            ...questions,
            ...paraCandidates,
            ...lineFallback,
          ]
      // Dedupe and cap
      const seen = new Set()
      const deduped = []
      for (const q of merged) {
        const key = normalizeSpace(q)
          .toLowerCase()
          .replace(/[×x]/g,'*')
          .replace(/÷/g,'/')
          .replace(/\s+/g,' ')
          .replace(/\s*=\s*$/,'')
        if (!key || seen.has(key)) continue
        seen.add(key)
        deduped.push(q)
      }
      const limit = Number.isFinite(maxItems) && maxItems > 0 ? Math.min(maxItems, 50) : 20
      questions = deduped.slice(0, limit)

      const buildItem = async (problemLine) => {
        // Extract a clean arithmetic expression if present to improve math solver reliability
        const findExpression = (s='') => {
          const text = String(s)
          const frac = text.match(/\b\d+\s*[⁄\/]\s*\d+\b/)
          if (frac) return frac[0]
          const op = text.match(/[-+]?\d+(?:\.\d+)?\s*([+\-*/x×÷])\s*[-+]?\d+(?:\.\d+)?/)
          if (op) {
            const m = op[0].replace(/x|×/g,'*').replace(/÷/g,'/')
            return m
          }
          return null
        }
        const exprOnly = findExpression(problemLine)
        // Prefer AI for general subjects
        let aiItem = null
        if (isAOAIConfigured()) {
          aiItem = await generateAnswer({
            promptText: problemLine,
            extractedText: undefined,
            subjectHint,
            gradeHint
          })
        }
        const mathTry = solveFromText(exprOnly || problemLine)
        let subj = subjectHint || (aiItem?.ok && (aiItem.answer.subject || null)) || (mathTry.success ? 'math' : null)
        let ans = (aiItem?.ok && (aiItem.answer.answer ?? null)) || (mathTry.success ? String(mathTry.result) : null)
        let expl = (aiItem?.ok && (aiItem.answer.explanation || (Array.isArray(aiItem.answer.steps) ? aiItem.answer.steps.join(' -> ') : null))) || (mathTry.success ? mathTry.steps.join(' | ') : null)
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

  if (questions.length > 1) {
        const items = []
        for (const q of questions) { items.push(await buildItem(q)) }
        return { status: 200, jsonBody: { items } }
      } else {
        const problemLine = questions[0] || (fullText || '').slice(0, 300)
        const single = await buildItem(problemLine)
        return { status: 200, jsonBody: single }
      }
    } catch (err) {
      const message = err?.message || 'Unknown error'
      const details = err?.response?.bodyAsText || err?.response?.status || undefined
      return { status: 500, jsonBody: { error: message, details } }
    }
  }
});
