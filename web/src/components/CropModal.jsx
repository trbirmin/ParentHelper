import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'

// Utility: crop the image using canvas and return a Blob
async function getCroppedBlob(imageSrc, cropPixels) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = imageSrc
  await new Promise((res, rej) => { image.onload = res; image.onerror = rej })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cropPixels.width))
  canvas.height = Math.max(1, Math.round(cropPixels.height))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    Math.max(0, Math.floor(cropPixels.x)),
    Math.max(0, Math.floor(cropPixels.y)),
    Math.max(1, Math.round(cropPixels.width)),
    Math.max(1, Math.round(cropPixels.height)),
    0,
    0,
    canvas.width,
    canvas.height
  )
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
}

export default function CropModal({ src, onCancel, onCropped, aspect = 4/3 }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedPixels, setCroppedPixels] = useState(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!src || !croppedPixels) return
    const blob = await getCroppedBlob(src, croppedPixels)
    onCropped?.(blob)
  }

  const stop = (e) => e.stopPropagation()

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden" onClick={stop}>
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold">Crop area</div>
          <button className="btn bg-slate-500 hover:bg-slate-600" onClick={onCancel}>Cancel</button>
        </div>
        <div className="relative h-[60vh]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="p-3 border-t border-slate-200 flex gap-3 justify-end">
          <button className="btn" onClick={handleConfirm} disabled={!croppedPixels}>Use crop</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
