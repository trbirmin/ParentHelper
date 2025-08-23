import React, { useCallback, useRef, useState } from 'react'
import CropModal from './CropModal'

// UploadCard
// - Lets users upload a worksheet or photo from disk (PDF/Word/images)
// - Validates file type, supports drag-and-drop and click-to-browse
// - Submits the file to the backend `/api/uploadFile` endpoint and shows results via parent callback

// MIME types we accept from the browser (extension fallback used if missing/empty)
const allowedMime = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif'
]

// 'accept' attribute advertised to the file picker
const acceptAttr = [
  '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif'
].join(',')

export default function UploadCard({ onResult, onClear }) {
  // Selected file reference
  const [file, setFile] = useState(null)
  // Whether a dragged file is over the drop zone (for styling)
  const [dragOver, setDragOver] = useState(false)
  // Network submission state
  const [loading, setLoading] = useState(false)
  // Ref to the hidden <input type="file"> for programmatic clicks
  const inputRef = useRef(null)
  const [showCrop, setShowCrop] = useState(false)
  const [tempPreview, setTempPreview] = useState('')
  const [tutorMode, setTutorMode] = useState(false)
  const [subjectHint, setSubjectHint] = useState('')
  const [gradeHint, setGradeHint] = useState('')
  const [targetLang, setTargetLang] = useState('')

  const validate = (f) => {
    // Ensure file exists and passes MIME or extension checks
    if (!f) return false
    if (allowedMime.includes(f.type)) return true
    // Some Word files may have empty type; fallback to extension check
    const name = (f.name || '').toLowerCase()
    return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') ||
      name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif')
  }

  const onFiles = useCallback((files) => {
    // Read the first file and validate; show a friendly alert on mismatch
    const f = files && files[0]
    if (!f) return
    if (!validate(f)) {
      alert('Unsupported file type. Please upload PDF, Word (.doc/.docx), or images (PNG/JPG/GIF).')
      return
    }
    // If it's an image, offer cropping first
    const isImage = /image\/(png|jpe?g|gif)/i.test(f.type) || /\.(png|jpe?g|gif)$/i.test(f.name || '')
    if (isImage) {
      const url = URL.createObjectURL(f)
      setTempPreview(url)
      setShowCrop(true)
      // we'll revoke url after crop modal closes
    } else {
      setFile(f)
    }
  }, [])

  const onDrop = (e) => {
    // Handle drop from desktop into the card
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer?.files?.length) {
      onFiles(e.dataTransfer.files)
    }
  }

  const onBrowse = (e) => {
    // File selected via the hidden input
    onFiles(e.target.files)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      // Send the file as multipart/form-data to the API
      const form = new FormData()
      form.append('file', file)
  if (subjectHint) form.append('subject', subjectHint)
  if (gradeHint) form.append('grade', gradeHint)
  if (tutorMode) form.append('tutorMode', '1')
  if (targetLang) form.append('targetLang', targetLang)
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
    // Clear any selected file and notify parent to clear results
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  const onCropCancel = () => {
    setShowCrop(false)
    if (tempPreview) URL.revokeObjectURL(tempPreview)
    setTempPreview('')
  }

  const onCropDone = async (blob) => {
    setShowCrop(false)
    if (tempPreview) URL.revokeObjectURL(tempPreview)
    setTempPreview('')
    if (blob) {
      const croppedFile = new File([blob], (file?.name || 'upload') + '.jpg', { type: 'image/jpeg' })
      setFile(croppedFile)
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Title and help text */}
      <h2 className="font-semibold text-lg">Upload file</h2>
      <p className="text-slate-600">PDF, Word, or image. Drop a file here or browse to select.</p>

      {/* Drag-and-drop area with click-to-browse fallback */}
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
        {/* Hidden file input tied to the card for click-to-browse */}
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          onChange={onBrowse}
          className="hidden"
        />
      </div>

      {/* Optional hints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Subject (optional)" value={subjectHint} onChange={(e)=>setSubjectHint(e.target.value)} />
        <input className="input" placeholder="Grade (optional)" value={gradeHint} onChange={(e)=>setGradeHint(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={tutorMode} onChange={(e)=>setTutorMode(e.target.checked)} />
          Tutor mode (step-by-step, Socratic hints)
        </label>
        <input className="input" placeholder="Target language (e.g., fr, es)" value={targetLang} onChange={(e)=>setTargetLang(e.target.value)} />
      </div>

      {/* Submit and clear actions */}
      <div className="flex gap-3">
        <button className="btn" onClick={onSubmit} disabled={!file || loading}>
          {loading ? 'Uploading…' : 'Submit'}
        </button>
        <button className="btn bg-slate-500 hover:bg-slate-600" type="button" onClick={clear}>Clear</button>
      </div>

      {showCrop && tempPreview && (
        <CropModal src={tempPreview} onCancel={onCropCancel} onCropped={onCropDone} />
      )}
    </div>
  )
}
