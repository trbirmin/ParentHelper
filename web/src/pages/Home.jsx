import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
const BlockMath = React.lazy(() => import('react-katex').then(m => ({ default: m.BlockMath })))
const InlineMath = React.lazy(() => import('react-katex').then(m => ({ default: m.InlineMath })))
// Home: entry page showing three input cards (Upload, Camera, Question)
// Displays results in a modal rendered via a React portal to avoid stacking/overflow issues
import UploadCard from '@/components/UploadCard'
import CameraCard from '@/components/CameraCard'
import QuestionCard from '@/components/QuestionCard'
import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const clearAll = () => setResult(null)

  const asText = (v) => typeof v === 'string' ? v : (v == null ? '' : (Array.isArray(v) ? v.join(' ') : JSON.stringify(v)))

  return (
    <div className="space-y-8">
      <section className="text-center py-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('title')}</h1>
        <p className="text-slate-600 max-w-3xl mx-auto">{t('subtitle')}</p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <UploadCard onResult={setResult} onClear={clearAll} />
        <CameraCard onResult={setResult} onClear={clearAll} />
        <QuestionCard onResult={setResult} onClear={clearAll} />
      </section>

      {result && (
        <ResultModal result={result} onClose={clearAll} asText={asText} />
      )}
    </div>
  )
}

function ResultModal({ result, onClose, asText }) {
  useEffect(() => {
    // Lock body scroll when modal is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const stop = (e) => e.stopPropagation()
  const isMathy = (s='') => /[=^_]|\\frac|\\sqrt|\d\s*[+\-*×x÷\/]\s*\d/.test(String(s))
  const [showSteps, setShowSteps] = useState(false)
  const [bilingual, setBilingual] = useState(false)
  const [lang, setLang] = useState('')
  const [sideProb, setSideProb] = useState('')
  const [sideProbLit, setSideProbLit] = useState('')
  const [sideAns, setSideAns] = useState('')
  const [sideAnsLit, setSideAnsLit] = useState('')
  const [sideExpl, setSideExpl] = useState('')
  const [sideExplLit, setSideExplLit] = useState('')
  const [sideSteps, setSideSteps] = useState([])
  const [sideStepsLit, setSideStepsLit] = useState([])
  const [sideBusy, setSideBusy] = useState(false)
  const [sideErr, setSideErr] = useState('')
  const [itemTrans, setItemTrans] = useState({}) // { [idx]: { prob, probLit, answer, answerLit, expl, explLit, steps:[], stepsLit:[] } }
  const [itemBusy, setItemBusy] = useState(false)
  const [itemErrs, setItemErrs] = useState({}) // { [idx]: string }

  // Low-level: call translate API and return parsed result
  const translateTextApi = async (text, to) => {
    try {
      const res = await fetch('/api/translateText', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, to }) })
      const ct = res.headers.get('content-type') || ''
      const data = ct.includes('application/json') ? await res.json() : { error: await res.text() }
      if (data && !data.error) {
        return { ok: true, translated: data.translated || '', transliteration: data.transliteration || '' }
      }
      return { ok: false, error: String(data?.error || `HTTP ${res.status}`) }
    } catch (e) {
      return { ok: false, error: 'Translation request failed' }
    }
  }
  const doTranslateSingle = async (res, to) => {
    setSideBusy(true)
    setSideErr('')
    setSideProb(''); setSideProbLit(''); setSideAns(''); setSideAnsLit(''); setSideExpl(''); setSideExplLit(''); setSideSteps([]); setSideStepsLit([])
    const probText = asText(res.problem)
    const ansText = asText(res.answer)
    const explText = asText(res.explanation)
    const steps = Array.isArray(res.steps) ? res.steps : []
    let anyErr = ''
    if (probText) {
      const r = await translateTextApi(probText, to)
      if (r.ok) { setSideProb(r.translated); setSideProbLit(r.transliteration||'') } else { anyErr ||= r.error }
    }
    if (ansText) {
      const r = await translateTextApi(ansText, to)
      if (r.ok) { setSideAns(r.translated); setSideAnsLit(r.transliteration||'') } else { anyErr ||= r.error }
    }
    if (explText) {
      const r = await translateTextApi(explText, to)
      if (r.ok) { setSideExpl(r.translated); setSideExplLit(r.transliteration||'') } else { anyErr ||= r.error }
    }
    if (steps.length) {
      const out = []; const outLit = []
      for (const s of steps) {
        const r = await translateTextApi(asText(s), to)
        if (r.ok) { out.push(r.translated); outLit.push(r.transliteration||'') } else { out.push(''); outLit.push(''); anyErr ||= r.error }
      }
      setSideSteps(out); setSideStepsLit(outLit)
    }
    setSideErr(anyErr)
    setSideBusy(false)
  }

  // Translate each item separately when result.items exists
  const doTranslateItems = async (items, to) => {
    if (!Array.isArray(items) || !to) return
    setItemBusy(true)
    setItemErrs({})
    const out = {}
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const ansText = asText(it?.answer)
      const explText = asText(it?.explanation)
      const steps = Array.isArray(it?.steps) ? it.steps : []
      const probText = asText(it?.problem)
      const cur = { prob:'', probLit:'', answer:'', answerLit:'', expl:'', explLit:'', steps:[], stepsLit:[] }
      let err = ''
      if (probText) {
        const r = await translateTextApi(probText, to)
        if (r.ok) { cur.prob = r.translated; cur.probLit = r.transliteration||'' } else { err ||= r.error }
      }
      if (ansText) {
        const r = await translateTextApi(ansText, to)
        if (r.ok) { cur.answer = r.translated; cur.answerLit = r.transliteration||'' } else { err ||= r.error }
      }
      if (explText) {
        const r = await translateTextApi(explText, to)
        if (r.ok) { cur.expl = r.translated; cur.explLit = r.transliteration||'' } else { err ||= r.error }
      }
      if (steps.length) {
        for (const s of steps) {
          const r = await translateTextApi(asText(s), to)
          if (r.ok) { cur.steps.push(r.translated); cur.stepsLit.push(r.transliteration||'') } else { cur.steps.push(''); cur.stepsLit.push(''); err ||= r.error }
        }
      }
      if (err) setItemErrs(prev => ({ ...prev, [i]: err }))
      out[i] = cur
    }
    setItemTrans(out)
    setItemBusy(false)
  }
  const [speaking, setSpeaking] = useState(false)
  const speak = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (!text) return
    const u = new SpeechSynthesisUtterance(text)
    u.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }
  const stopSpeak = () => { if (window.speechSynthesis){ window.speechSynthesis.cancel(); setSpeaking(false) } }
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={stop}
      >
  {/* Modal header with controls */}
  <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-semibold">Results</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={showSteps} onChange={e=>setShowSteps(e.target.checked)} /> Show steps</label>
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={bilingual} onChange={e=>{setBilingual(e.target.checked); if(!e.target.checked){ setLang(''); setSideProb(''); setSideProbLit(''); setSideAns(''); setSideAnsLit(''); setSideExpl(''); setSideExplLit(''); setSideSteps([]); setSideStepsLit([]); setSideErr(''); setItemTrans({}); setItemErrs({}) }}} /> Bilingual</label>
            {bilingual && (
              <select className="input text-xs py-1" value={lang} onChange={async (e)=>{
                const v = e.target.value; setLang(v)
                // Clear previous translations
                setSideProb(''); setSideProbLit(''); setSideAns(''); setSideAnsLit(''); setSideExpl(''); setSideExplLit(''); setSideSteps([]); setSideStepsLit([]); setSideErr(''); setItemTrans({}); setItemErrs({})
                if (!v) return
                if (Array.isArray(result?.items)) {
                  await doTranslateItems(result.items, v)
                } else {
                  await doTranslateSingle(result, v)
                }
              }}>
                <option value="">Select language…</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
                <option value="it">Italian (it)</option>
                <option value="pt">Portuguese (pt)</option>
                <option value="zh-Hans">Chinese (zh-Hans)</option>
                <option value="ja">Japanese (ja)</option>
                <option value="ko">Korean (ko)</option>
                <option value="ar">Arabic (ar)</option>
              </select>
            )}
            {!speaking ? (
              <button className="btn" onClick={()=>{
                const buildItemText = (it) => {
                  const parts = []
                  const q = asText(it?.problem)
                  const a = asText(it?.answer)
                  const e = asText(it?.explanation)
                  if (q) parts.push(`Question: ${q}`)
                  if (a) parts.push(`Answer: ${a}`)
                  if (e) parts.push(`Explanation: ${e}`)
                  return parts.join('. ')
                }
                const text = Array.isArray(result?.items)
                  ? result.items.map(buildItemText).filter(Boolean).join('. ')
                  : buildItemText(result)
                speak(text)
              }}>Read aloud</button>
            ) : (
              <button className="btn bg-slate-500 hover:bg-slate-600" onClick={stopSpeak}>Stop</button>
            )}
            <button className="btn bg-slate-500 hover:bg-slate-600" onClick={onClose}>Close</button>
          </div>
        </div>
  {/* Scrollable content area */}
  <div className="max-h-[75vh] overflow-auto p-4">
          {result.error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{String(result.error)}</div>
          ) : Array.isArray(result?.items) ? (
            <div className="space-y-4">
              {result.items.length === 0 && (
                  <div className="text-slate-500 text-sm">No questions detected.</div>
              )}
              {result.items.length > 0 && result.items.map((it, idx) => {
                const subj = asText(it.subject)
                const prob = asText(it.problem)
                const ans = asText(it.answer)
                const expl = asText(it.explanation)
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 p-4">
                    <div className={bilingual && lang ? 'grid md:grid-cols-2 gap-4' : ''}>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Question {idx + 1}{subj ? ` • ${subj}` : ''}</div>
                        {prob && (
                          <div className="mt-1">
                            <div className="text-xs text-slate-500">Question</div>
                            <div className="font-medium">{prob}</div>
                          </div>
                        )}
                        {ans && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">Answer</div>
                            <div className="text-emerald-700 font-semibold">
                              {isMathy(ans) ? <React.Suspense fallback={ans}><BlockMath math={ans} /></React.Suspense> : ans}
                            </div>
                          </div>
                        )}
                        {expl && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">Explanation</div>
                            <div className="text-slate-700 whitespace-pre-wrap">
                              {isMathy(expl) ? <React.Suspense fallback={expl}><BlockMath math={expl} /></React.Suspense> : expl}
                            </div>
                          </div>
                        )}
                      </div>
                      {bilingual && lang && (ans || expl || prob) && (
                        <div>
                          <div className="text-xs text-slate-500">Translation</div>
                          {itemBusy && !itemTrans[idx] && <div className="text-slate-500 text-xs">Translating…</div>}
                          {itemErrs[idx] && <div className="text-red-600 text-xs">{itemErrs[idx]}</div>}
                          {prob && (
                            <div className="mt-1">
                              <div className="text-xs text-slate-500">Question</div>
                              <div className="font-medium">{(itemTrans[idx] && itemTrans[idx].prob) || prob}</div>
                              {itemTrans[idx]?.probLit && <div className="text-slate-600 text-sm">{itemTrans[idx].probLit}</div>}
                            </div>
                          )}
                          {itemTrans[idx]?.answer && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Answer</div>
                              <div className="font-semibold">{itemTrans[idx].answer}</div>
                              {itemTrans[idx]?.answerLit && <div className="text-slate-600 text-sm">{itemTrans[idx].answerLit}</div>}
                            </div>
                          )}
        {showSteps && Array.isArray(itemTrans[idx]?.steps) && itemTrans[idx].steps.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Steps</div>
                              <ul className="list-disc list-inside text-slate-700">
          {itemTrans[idx].steps.map((s,i)=>(<li key={i}>{s}</li>))}
                              </ul>
                            </div>
                          )}
                          {itemTrans[idx]?.expl && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Explanation</div>
                              <div className="text-slate-700 whitespace-pre-wrap">{itemTrans[idx].expl}</div>
                              {itemTrans[idx]?.explLit && <div className="text-slate-600 text-sm">{itemTrans[idx].explLit}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const subj = asText(result.subject)
                const prob = asText(result.problem)
                const ans = asText(result.answer)
                const expl = asText(result.explanation)
                const handwriting = result.handwriting ? true : false
                const latex = asText(result.latex)
                const steps = Array.isArray(result.steps) ? result.steps : []
                const orig = asText(result.originalAnswer)
                const trans = asText(result.translation)
                const transLit = asText(result.translationTransliteration)
                return (
                  <>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      {subj && <span>{subj}</span>}
                      {handwriting && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Handwriting</span>}
                    </div>
                    {prob && (
                      <div className="mt-1">
                        <div className="text-xs text-slate-500">Question</div>
                        <div className="font-medium">{prob}</div>
                      </div>
                    )}
                    <div className={bilingual ? 'grid md:grid-cols-2 gap-4' : ''}>
                      <div>
                        {ans && (
                          <div>
                            <div className="text-xs text-slate-500">Answer</div>
                            <div className="text-emerald-700 font-semibold">{isMathy(ans) ? <React.Suspense fallback={ans}><BlockMath math={ans} /></React.Suspense> : ans}</div>
                          </div>
                        )}
                        {latex && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">LaTeX (table)</div>
                            <div className="text-slate-700 whitespace-pre-wrap text-sm">{latex}</div>
                          </div>
                        )}
                        {showSteps && steps.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">Steps</div>
                            <ul className="list-disc list-inside text-slate-700">
                                {showSteps && steps.map((s,i)=>(<li key={i}>{s}</li>))}
                            </ul>
                          </div>
                        )}
                        {expl && (
                          <div>
                            <div className="text-xs text-slate-500">Explanation</div>
                            <div className="text-slate-700 whitespace-pre-wrap">{isMathy(expl) ? <React.Suspense fallback={expl}><BlockMath math={expl} /></React.Suspense> : expl}</div>
                          </div>
                        )}
                      </div>
                      {bilingual && (
                        <div>
                          <div className="text-xs text-slate-500">Translation</div>
                          {sideBusy && <div className="text-slate-500 text-xs">Translating…</div>}
                          {(!sideBusy && sideErr) && <div className="text-red-600 text-xs">{sideErr}</div>}
                          {prob && (
                            <div className="mt-1">
                              <div className="text-xs text-slate-500">Question</div>
                              <div className="font-medium">{sideProb || prob}</div>
                              {sideProbLit && <div className="text-slate-600 text-sm">{sideProbLit}</div>}
                            </div>
                          )}
                          {sideAns && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Answer</div>
                              <div className="font-semibold">{sideAns}</div>
                              {sideAnsLit && <div className="text-slate-600 text-sm">{sideAnsLit}</div>}
                            </div>
                          )}
        {showSteps && Array.isArray(sideSteps) && sideSteps.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Steps</div>
                              <ul className="list-disc list-inside text-slate-700">
          {sideSteps.map((s,i)=>(<li key={i}>{s}</li>))}
                              </ul>
                            </div>
                          )}
                          {sideExpl && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Explanation</div>
                              <div className="text-slate-700 whitespace-pre-wrap">{sideExpl}</div>
                              {sideExplLit && <div className="text-slate-600 text-sm">{sideExplLit}</div>}
                            </div>
                          )}
                          {!sideAns && !sideExpl && trans && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-500">Translated</div>
                              <div className="font-semibold">{trans}</div>
                              {transLit && <div className="text-slate-600 text-sm">{transLit}</div>}
                            </div>
                          )}
                          {orig && <div className="text-slate-500 text-xs mt-1">Original: {orig}</div>}
                        </div>
                      )}
                    </div>
                    {(!ans && !expl) && (
                      <div className="text-slate-500 text-sm">No answer detected.</div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
