import React, { useState } from 'react'
import subjectsData from '@/data/subjects.json'

export default function SubjectsPage() {
  const bands = subjectsData?.gradeBands || []
  const [bandIdx, setBandIdx] = useState(0)
  const band = bands[bandIdx] || { categories: [] }
  const categories = band.categories || []

  return (
    <div className="max-w-7xl mx-auto">
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-3">
          <h1 className="text-xl font-semibold">Subjects</h1>
          <div className="flex flex-wrap gap-2">
            {bands.map((b, i) => (
              <button
                key={b.id}
                className={`px-3 py-1.5 rounded-xl border text-sm ${i===bandIdx ? 'bg-brand-50 border-brand-300 text-brand-800' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'}`}
                onClick={() => setBandIdx(i)}
                aria-pressed={i===bandIdx}
              >{b.label}</button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {categories.map((cat) => (
            <section key={cat.name} className="rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">{cat.name}</h2>
              <ul className="list-disc list-inside space-y-1 text-slate-800">
                {(cat.topics || []).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
