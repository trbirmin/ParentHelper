import React, { useCallback, useRef, useState } from 'react'

const allowedMime = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif'
]

const acceptAttr = [
  '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif'
].join(',')

export default function UploadCard({ onResult, onClear }) {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const validate = (f) => {
    if (!f) return false
    if (allowedMime.includes(f.type)) return true
    // Some Word files may have empty type; fallback to extension check
    const name = (f.name || '').toLowerCase()
    return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') ||
      name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif')
  }

  const onFiles = useCallback((files) => {
    const f = files && files[0]
    if (!f) return
    if (!validate(f)) {
      alert('Unsupported file type. Please upload PDF, Word (.doc/.docx), or images (PNG/JPG/GIF).')
      return
    }
    setFile(f)
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer?.files?.length) {
      onFiles(e.dataTransfer.files)
    }
  }

  const onBrowse = (e) => {
    onFiles(e.target.files)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/uploadFile', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
      onResult?.(data)
      // Reset selection so the card is ready for another upload
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      onResult?.({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Upload file</h2>
      <p className="text-slate-600">PDF, Word, or image. Drop a file here or browse to select.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer select-none transition-colors ${dragOver ? 'bg-brand-50 border-brand-300' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Upload file"
      >
        <div className="text-slate-600">
          {file ? (
            <div className="font-medium">Selected: {file.name}</div>
          ) : (
            <>
              <div className="font-medium mb-1">Drag & drop your file here</div>
              <div className="text-sm">or click to browse</div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          onChange={onBrowse}
          className="hidden"
        />
      </div>

      <div className="flex gap-3">
        <button className="btn" onClick={onSubmit} disabled={!file || loading}>
          {loading ? 'Uploading…' : 'Submit'}
        </button>
        <button className="btn bg-slate-500 hover:bg-slate-600" type="button" onClick={clear}>Clear</button>
      </div>
    </div>
  )
}
