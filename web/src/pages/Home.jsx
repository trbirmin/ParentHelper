import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import UploadCard from '@/components/UploadCard'
import CameraCard from '@/components/CameraCard'
import QuestionCard from '@/components/QuestionCard'

export default function Home() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const clearAll = () => setResult(null)

  const asText = (v) => typeof v === 'string' ? v : (v == null ? '' : (Array.isArray(v) ? v.join(' ') : JSON.stringify(v)))

  return (
    <div className="space-y-8">
      <section className="text-center py-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Help your child with homework, confidently</h1>
        <p className="text-slate-600 max-w-3xl mx-auto">Upload a worksheet, snap a picture, or type a question. We’ll guide you with clear, parent-friendly explanations.</p>
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
  }, [])

  const stop = (e) => e.stopPropagation()
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
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-semibold">Results</h3>
          <button className="btn bg-slate-500 hover:bg-slate-600" onClick={onClose}>Close</button>
        </div>
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
                        <div className="text-emerald-700 font-semibold">{ans}</div>
                      </div>
                    )}
                    {expl && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500">Explanation</div>
                        <div className="text-slate-700 whitespace-pre-wrap">{expl}</div>
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
                return (
                  <>
                    {subj && (<div className="text-xs uppercase tracking-wide text-slate-500">{subj}</div>)}
                    {prob && <div className="font-medium">{prob}</div>}
                    {ans && (
                      <div>
                        <div className="text-xs text-slate-500">Answer</div>
                        <div className="text-emerald-700 font-semibold">{ans}</div>
                      </div>
                    )}
                    {expl && (
                      <div>
                        <div className="text-xs text-slate-500">Explanation</div>
                        <div className="text-slate-700 whitespace-pre-wrap">{expl}</div>
                      </div>
                    )}
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
