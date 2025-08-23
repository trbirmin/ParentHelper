import React, { useMemo, useState } from 'react'

// Simple subject catalog grouped by grade bands
const SUBJECTS = [
  {
    id: 'k2',
    label: 'K–2',
    items: ['Reading', 'Phonics', 'Handwriting', 'Numbers & Counting', 'Shapes', 'Time', 'Science Basics']
  },
  {
    id: '35',
    label: '3–5',
    items: ['ELA', 'Math (Fractions, Decimals)', 'Science', 'Social Studies', 'Geography', 'Art', 'Music']
  },
  {
    id: '68',
    label: '6–8',
    items: ['ELA', 'Pre-Algebra', 'Algebra I', 'Life Science', 'Earth Science', 'World History', 'Civics', 'Computer Science']
  },
  {
    id: '912',
    label: '9–12',
    items: ['ELA', 'Algebra II', 'Geometry', 'Precalculus', 'Biology', 'Chemistry', 'Physics', 'US History', 'Economics', 'Spanish', 'French']
  }
]

export default function SubjectsBlade({ open = true, onSelect, inline = true }) {
  const [bandIdx, setBandIdx] = useState(0)
  const bands = useMemo(() => SUBJECTS, [])
  const band = bands[bandIdx]

  if (!open) return null

  if (inline) {
    return (
      <aside className="card w-full sm:w-[18rem] lg:w-[22rem] h-fit sticky top-4 self-start">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold">Subjects</h2>
        </div>
        <div className="p-4 flex gap-2 flex-wrap">
          {bands.map((b, i) => (
            <button
              key={b.id}
              className={`px-3 py-1.5 rounded-xl border text-sm ${i===bandIdx ? 'bg-brand-50 border-brand-300 text-brand-800' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'}`}
              onClick={() => setBandIdx(i)}
              aria-pressed={i===bandIdx}
            >{b.label}</button>
          ))}
        </div>
        <ul className="p-4 space-y-1">
          {band.items.map((s) => (
            <li key={s}>
              <button
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => onSelect?.(s)}
              >{s}</button>
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  return null
}
