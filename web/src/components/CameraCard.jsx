import React, { useEffect, useRef, useState } from 'react'

export default function CameraCard({ onResult, onClear }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  // Removed subject, grade, target language, and tutor mode fields per request
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const mediaStreamRef = useRef(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const supportsLiveCamera = () => {
    const isLocalhost = typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices && (window.isSecureContext || isLocalhost)
  }

  const startLive = async () => {
    if (!supportsLiveCamera()) {
      // No secure context or no mediaDevices
      setCameraError(true)
      return
    }
    try {
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
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (blob) {
      const capturedFile = new File([blob], 'camera.jpg', { type: 'image/jpeg' })
      setFile(capturedFile)
      stopLive()
    }
  }

  const clear = () => {
    setFile(null)
  // no extra fields
    onClear?.()
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('image', file)
  // no extra fields
      const res = await fetch('/api/processImage', { method: 'POST', body: form })
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
  <h2 className="font-semibold text-lg">Take picture</h2>
      <p className="text-slate-600">Use your camera to snap the homework. If camera access is blocked, please use the Upload file option.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 place-items-center">
        <button className="btn text-lg py-3 px-5 whitespace-nowrap justify-self-center sm:col-span-2" onClick={startLive}>
          {streaming ? 'Camera on' : 'Turn on camera'}
        </button>
      </div>

      {cameraError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Camera isn’t available or permission was denied. Please allow camera access or use the “Upload file” card instead.
        </div>
      )}

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

      {previewUrl && (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
        </div>
      )}

  {/* Optional hints removed */}

      {/* Submission and reset controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <button className="btn text-lg py-3 w-full whitespace-nowrap" onClick={onSubmit} disabled={!file || loading}>
          {loading ? 'Sending…' : 'Submit'}
        </button>
        <button className="btn bg-slate-500 hover:bg-slate-600 w-full whitespace-nowrap" type="button" onClick={clear}>Clear</button>
        <button className="btn bg-slate-700 hover:bg-slate-800 w-full whitespace-nowrap" type="button" onClick={startLive}>Retake</button>
      </div>
    </div>
  )
}
