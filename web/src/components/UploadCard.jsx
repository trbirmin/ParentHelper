import React, { useCallback, useRef, useState, Suspense } from 'react'
const CropModal = React.lazy(() => import('./CropModal'))

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
  // Removed tutor mode, subject/grade hints, and target language inputs

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
  // Removed subject, grade, tutorMode, and targetLang fields
      const res = await fetch('/api/uploadFile', { method: 'POST', body: form })
      let data
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text().catch(()=> '')
        data = { error: 'Invalid JSON response', status: res.status, body: text?.slice?.(0, 1000) || '' }
      }
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
    <div className="card p-5 flex flex-col gap-4 transition-shadow hover:shadow-md">
      {/* Title and help text */}
  <h2 className="font-semibold text-lg flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-brand-600"><path d="M4 4a2 2 0 012-2h7.586A2 2 0 0115 2.586L19.414 7A2 2 0 0120 8.414V20a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/><path d="M14 2.586V6a2 2 0 002 2h3.414"/></svg>
        Upload file
      </h2>
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

  {/* Removed Subject, Grade, Tutor mode, and Target language inputs */}

      {/* Submit and clear actions */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <button className="btn w-full whitespace-nowrap disabled:opacity-60 relative" onClick={onSubmit} disabled={!file || loading}>
          {loading && (
            <span className="absolute left-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" aria-hidden />
          )}
          {loading ? 'Uploading…' : 'Submit'}
        </button>
        <button className="btn bg-slate-500 hover:bg-slate-600 w-full whitespace-nowrap" type="button" onClick={clear}>Clear</button>
      </div>

      {showCrop && tempPreview && (
        <Suspense fallback={null}>
          <CropModal src={tempPreview} onCancel={onCropCancel} onCropped={onCropDone} />
        </Suspense>
      )}
    </div>
  )
}
