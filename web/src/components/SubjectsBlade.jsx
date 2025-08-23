import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import subjectsData from '@/data/subjects.json'

export default function SubjectsBlade({ open, onClose, inline = false }) {
  const [bandIdx, setBandIdx] = useState(0)

  useEffect(() => {
    if (inline) return
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, inline])

  const bands = subjectsData?.gradeBands || []
  const band = bands[bandIdx] || { categories: [] }
  const categories = band.categories || []

  const stop = (e) => e.stopPropagation()

  if (inline) {
    return (
      <aside className="w-full sm:w-[20rem] lg:w-[24rem] border-r border-slate-200 bg-white min-h-screen">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold">Subjects</h2>
        </div>
        <div className="p-3 border-b border-slate-200 flex flex-wrap gap-2">
          {bands.map((b, i) => (
            <button
              key={b.id}
              className={`px-3 py-1.5 rounded-xl border text-sm ${i===bandIdx ? 'bg-brand-50 border-brand-300 text-brand-800' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
              onClick={() => setBandIdx(i)}
              aria-pressed={i===bandIdx}
            >{b.label}</button>
          ))}
        </div>
        <div className="p-4 overflow-auto" style={{maxHeight:'calc(100vh - 9rem)'}}>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.name}>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{cat.name}</div>
                <ul className="list-disc list-inside space-y-1">
                  {(cat.topics || []).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute left-0 top-0 h-full w-full sm:w:[28rem] bg-white shadow-xl" onClick={stop}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold">Subjects</h2>
          <button className="btn bg-slate-500 hover:bg-slate-600" onClick={onClose}>Close</button>
        </div>
        <div className="p-3 border-b border-slate-200 flex flex-wrap gap-2">
          {bands.map((b, i) => (
            <button
              key={b.id}
              className={`px-3 py-1.5 rounded-xl border text-sm ${i===bandIdx ? 'bg-brand-50 border-brand-300 text-brand-800' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
              onClick={() => setBandIdx(i)}
              aria-pressed={i===bandIdx}
            >{b.label}</button>
          ))}
        </div>
        <div className="p-4 overflow-auto h-[calc(100%-7rem)]">
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.name}>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{cat.name}</div>
                <ul className="list-disc list-inside space-y-1">
                  {(cat.topics || []).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
