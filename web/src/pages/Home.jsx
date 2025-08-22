import React, { useState } from 'react'
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
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Results</h3>
            <button className="btn bg-slate-500 hover:bg-slate-600" onClick={clearAll}>Close</button>
          </div>

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
        </section>
      )}
    </div>
  )
}
