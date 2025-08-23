import React, { useRef, useState, useEffect } from 'react'

const MAX = 500

export default function QuestionCard({ onResult, onClear }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  // Removed subject, grade, target language, and tutor mode fields per request
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const recognitionRef = useRef(null)

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

  const startSpeech = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSpeechError('Speech recognition is not supported in this browser.')
        return
      }
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ''
        if (transcript) setQ(prev => (prev ? prev + ' ' : '') + transcript)
      }
      recognition.onerror = (e) => setSpeechError(e?.error || 'Speech error')
      recognition.onend = () => { /* no-op */ }
      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      setSpeechError('Could not start speech recognition.')
    }
  }

  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    setSpeechSupported(!!SpeechRecognition)
    return () => {
      try { recognitionRef.current?.abort?.() } catch {}
    }
  }, [])

  const clear = () => {
    setQ('')
  // no extra fields
    setSpeechError('')
    onClear?.()
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Type or speak a question</h2>
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
        <div className="flex items-center gap-3">
          <button type="button" className="btn" onClick={startSpeech} disabled={!speechSupported}>🎤 Speak</button>
          {!speechSupported && <span className="text-sm text-slate-500">Speech not supported</span>}
        </div>
        {speechError && (
          <div className="text-sm text-red-600">{speechError}</div>
        )}
  {/* Optional hints removed */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <button type="submit" className="btn text-lg py-3 w-full whitespace-nowrap" disabled={!canSubmit}>
            {loading ? 'Submitting…' : 'Submit'}
          </button>
          <button type="button" className="btn bg-slate-500 hover:bg-slate-600 w-full whitespace-nowrap" onClick={clear}>Clear</button>
        </div>
      </form>
    </div>
  )
}
