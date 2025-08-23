import React, { useEffect, useRef, useState } from 'react'

// QuestionCard
// - Textarea for typed questions with character limit
// - Optional voice input using Web Speech API when supported
// - Submits to `/api/processText` and displays results via parent callback

const MAX = 500

export default function QuestionCard({ onResult, onClear }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const recognitionRef = useRef(null)
  const [tutorMode, setTutorMode] = useState(false)
  const [subjectHint, setSubjectHint] = useState('')
  const [gradeHint, setGradeHint] = useState('')
  const [targetLang, setTargetLang] = useState('')

  useEffect(() => {
    // Detect browser speech recognition support and cleanup on unmount
    const supported = typeof window !== 'undefined' && (
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    )
    setSpeechSupported(!!supported)
    return () => {
      try {
        recognitionRef.current?.stop?.()
      } catch {}
    }
  }, [])

  const count = q.length
  const canSubmit = count > 0 && count <= MAX && !loading

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      // POST the typed question to the API as JSON
      const res = await fetch('/api/processText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, tutorMode, subject: subjectHint || undefined, grade: gradeHint || undefined, targetLang: targetLang || undefined })
      })
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
      onResult?.(data)
      setQ('')
    } catch (err) {
      onResult?.({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setQ('')
    onClear?.()
  }

  const startVoice = () => {
    setSpeechError('')
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) {
        setSpeechError('Speech recognition not supported in this browser')
        return
      }
      const rec = new SR()
      recognitionRef.current = rec
      rec.lang = 'en-US'
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onstart = () => setRecording(true)
      rec.onresult = (e) => {
        const transcript = (e.results?.[0]?.[0]?.transcript || '').trim()
        if (transcript) {
          setQ(prev => (prev ? (prev.trim() + ' ' + transcript) : transcript).slice(0, MAX))
        }
      }
      rec.onerror = (e) => {
        setSpeechError(e?.error === 'not-allowed' ? 'Mic permission denied' : (e?.error || 'Speech error'))
      }
      rec.onend = () => setRecording(false)
      rec.start()
    } catch (err) {
      setSpeechError(err?.message || 'Unable to start speech recognition')
      setRecording(false)
    }
  }

  const stopVoice = () => {
    try { recognitionRef.current?.stop?.() } catch {}
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
          <div className="flex items-center gap-3">
            {speechSupported ? (
              <button
                type="button"
                onClick={recording ? stopVoice : startVoice}
                className={`rounded-full border px-3 py-1.5 flex items-center gap-2 transition-colors ${recording ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                title={recording ? 'Stop listening' : 'Speak your question'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 1 1-12 0H4a8.001 8.001 0 0 0 7 8.93z"/>
                </svg>
                {recording ? 'Listening…' : 'Speak'}
              </button>
            ) : (
              <span className="text-slate-500">Voice not supported</span>
            )}
            <span className="hidden sm:inline">Max {MAX} characters</span>
          </div>
          <span>{count}/{MAX}</span>
        </div>
        {speechError && (
          <div className="text-sm text-red-600">{speechError}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Subject (optional)" value={subjectHint} onChange={(e)=>setSubjectHint(e.target.value)} />
          <input className="input" placeholder="Grade (optional)" value={gradeHint} onChange={(e)=>setGradeHint(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tutorMode} onChange={(e)=>setTutorMode(e.target.checked)} />
            Tutor mode (step-by-step, Socratic hints)
          </label>
          <input className="input" placeholder="Target language (e.g., fr, es)" value={targetLang} onChange={(e)=>setTargetLang(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn text-lg py-3" disabled={!canSubmit}>
            {loading ? 'Submitting…' : 'Submit question'}
          </button>
          <button type="button" className="btn bg-slate-500 hover:bg-slate-600" onClick={clear}>Clear</button>
        </div>
      </form>
    </div>
  )
}
