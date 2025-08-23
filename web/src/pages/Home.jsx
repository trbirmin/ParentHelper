import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BlockMath, InlineMath } from 'react-katex'
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
  const [bilingual, setBilingual] = useState(true)
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
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={bilingual} onChange={e=>setBilingual(e.target.checked)} /> Bilingual</label>
            {!speaking ? (
              <button className="btn" onClick={()=>{
                const text = Array.isArray(result?.items) ? result.items.map(it=>asText(it.answer||it.explanation)).join('. ') : asText(result.answer||result.explanation)
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
                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Question {idx + 1}{subj ? ` • ${subj}` : ''}</div>
                    {prob && <div className="font-medium mb-1">{prob}</div>}
                    {ans && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500">Answer</div>
                        <div className="text-emerald-700 font-semibold">
                          {isMathy(ans) ? <BlockMath math={ans} /> : ans}
                        </div>
                      </div>
                    )}
                    {expl && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500">Explanation</div>
                        <div className="text-slate-700 whitespace-pre-wrap">
                          {isMathy(expl) ? <BlockMath math={expl} /> : expl}
                        </div>
                      </div>
                    )}
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
                    {prob && <div className="font-medium">{prob}</div>}
                    <div className={bilingual ? 'grid md:grid-cols-2 gap-4' : ''}>
                      <div>
                        {ans && (
                          <div>
                            <div className="text-xs text-slate-500">Answer</div>
                            <div className="text-emerald-700 font-semibold">{isMathy(ans) ? <BlockMath math={ans} /> : ans}</div>
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
                              {steps.map((s,i)=>(<li key={i}>{s}</li>))}
                            </ul>
                          </div>
                        )}
                        {expl && (
                          <div>
                            <div className="text-xs text-slate-500">Explanation</div>
                            <div className="text-slate-700 whitespace-pre-wrap">{isMathy(expl) ? <BlockMath math={expl} /> : expl}</div>
                          </div>
                        )}
                      </div>
                      {bilingual && (trans || transLit) && (
                        <div>
                          <div className="text-xs text-slate-500">Translation</div>
                          {trans && <div className="font-semibold">{trans}</div>}
                          {transLit && <div className="text-slate-600 text-sm">{transLit}</div>}
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
