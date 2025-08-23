import React, { useState } from 'react'

const MAX = 500

export default function QuestionCard({ onResult }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const count = q.length
  const canSubmit = count > 0 && count <= MAX && !loading

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await fetch('/api/processText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      })
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
      onResult?.(data)
    } catch (err) {
      onResult?.({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Type question</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, MAX))}
          placeholder="Type your child’s homework question here…"
          maxLength={MAX}
          className="w-full h-40 resize-y rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Max {MAX} characters</span>
          <span>{count}/{MAX}</span>
        </div>
        <button type="submit" className="btn text-lg py-3" disabled={!canSubmit}>
          {loading ? 'Submitting…' : 'Submit question'}
        </button>
      </form>
    </div>
  )
}
