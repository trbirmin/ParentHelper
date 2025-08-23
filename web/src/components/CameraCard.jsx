import React, { useEffect, useRef, useState, Suspense } from 'react'
const CropModal = React.lazy(() => import('./CropModal'))

// CameraCard
// - Lets users take a photo with the device camera or submit a previously captured preview
// - Shows a live camera preview (when permitted), supports capture/stop/retake
// - Submits the captured image to the backend `/api/processImage` endpoint

export default function CameraCard({ onResult, onClear }) {
  // Selected/captured image file
  const [file, setFile] = useState(null)
  // Local object URL used to render the image preview
  const [previewUrl, setPreviewUrl] = useState('')
  // Network submission state
  const [loading, setLoading] = useState(false)
  // Whether the live camera stream is active
  const [streaming, setStreaming] = useState(false)
  // Whether camera is unavailable or permission was denied
  const [cameraError, setCameraError] = useState(false)
  // Refs to the <video> element (live preview), hidden <canvas>, and active MediaStream
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const [showCrop, setShowCrop] = useState(false)
  const [tempPreview, setTempPreview] = useState('')
  // Removed tutor mode, subject/grade hints, and target language inputs

  useEffect(() => {
    // When a new file is set, create a blob URL for the preview
    if (!file) {
      setPreviewUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    // Revoke the URL when the component unmounts or file changes to avoid leaks
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Returns true if the browser supports getUserMedia and we're in a secure context
  // (or localhost, which is allowed for dev without HTTPS)
  const supportsLiveCamera = () => {
    const isLocalhost = typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices && (window.isSecureContext || isLocalhost)
  }

  const startLive = async () => {
    // Guard: no secure context or no mediaDevices
    if (!supportsLiveCamera()) {
      // No secure context or no mediaDevices
      setCameraError(true)
      return
    }
    try {
      // Request the environment (rear) camera when available
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreaming(true)
      setCameraError(false)
    } catch (err) {
      // Permission denied or no camera
      setCameraError(true)
    }
  }

  const stopLive = () => {
    // Stop all tracks on the active stream and clear the video element
    const stream = mediaStreamRef.current
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStreaming(false)
  }

  const capture = async () => {
    // Take a snapshot from the live video into a canvas, then to a Blob/File
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (blob) {
  // Open crop modal first
  const url = URL.createObjectURL(blob)
  setTempPreview(url)
  setShowCrop(true)
  stopLive()
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      // Send the captured/selected file to the API as `image`
      const form = new FormData()
      form.append('image', file)
  // Removed subject, grade, tutorMode, and targetLang fields
      const res = await fetch('/api/processImage', { method: 'POST', body: form })
      let data
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text().catch(()=> '')
        data = { error: 'Invalid JSON response', status: res.status, body: text?.slice?.(0, 1000) || '' }
      }
      onResult?.(data)
  // Keep preview so the user sees the image alongside results; they can Clear or Retake
    } catch (err) {
      onResult?.({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    // Reset captured file and preview; notify parent to clear results
    setFile(null)
    setPreviewUrl('')
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
      const capturedFile = new File([blob], 'camera.jpg', { type: 'image/jpeg' })
      setFile(capturedFile)
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Title and help text */}
  <h2 className="font-semibold text-lg">Take picture</h2>
      <p className="text-slate-600">Use your camera to snap the homework. If camera access is blocked, please use the Upload file option.</p>

      {/* Live camera toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 place-items-center">
        <button className="btn text-lg py-3 px-5 whitespace-nowrap justify-self-center sm:col-span-2" onClick={startLive}>
          {streaming ? 'Camera on' : 'Turn on camera'}
        </button>
      </div>

      {/* Error banner if camera is unavailable or permission denied */}
      {cameraError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Camera isn’t available or permission was denied. Please allow camera access or use the “Upload file” card instead.
        </div>
      )}

      {/* Live camera preview with Capture/Stop controls */}
      {streaming && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="btn w-full" onClick={capture}>Capture</button>
            <button className="btn bg-slate-500 hover:bg-slate-600 w-full" onClick={stopLive}>Stop camera</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Static preview of the last captured image */}
      {previewUrl && (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
        </div>
      )}

  {/* Removed Subject, Grade, Tutor mode, and Target language inputs */}

      {/* Submission and reset controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <button className="btn text-lg py-3 w-full whitespace-nowrap" onClick={onSubmit} disabled={!file || loading}>
          {loading ? 'Sending…' : 'Submit'}
        </button>
        <button className="btn bg-slate-500 hover:bg-slate-600 w-full whitespace-nowrap" type="button" onClick={clear}>Clear</button>
        <button className="btn bg-slate-700 hover:bg-slate-800 w-full whitespace-nowrap" type="button" onClick={startLive}>Retake</button>
      </div>

      {showCrop && tempPreview && (
        <Suspense fallback={null}>
          <CropModal src={tempPreview} onCancel={onCropCancel} onCropped={onCropDone} />
        </Suspense>
      )}
    </div>
  )
}
