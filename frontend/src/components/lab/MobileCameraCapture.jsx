import { useState, useRef, useEffect } from 'react'

export default function MobileCameraCapture({ onCaptureComplete, onCancel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedPages, setCapturedPages] = useState([]) // Array of Data URLs
  const [currentPreview, setCurrentPreview] = useState(null)
  const [qualityWarning, setQualityWarning] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  // Start Camera Stream
  useEffect(() => {
    let activeStream = null
    async function startCamera() {
      try {
        setCameraError(null)
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        setStream(activeStream)
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream
        }
        setCameraActive(true)
      } catch (err) {
        console.error('Camera access error:', err)
        setCameraError('Unable to access rear camera. Please check permissions or upload a file.')
      }
    }
    startCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Client-Side Quality Heuristics (Blur & Glare Detection)
  const analyzeQuality = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    let totalPixelCount = width * height
    let brightPixelCount = 0
    let laplacianVarianceSum = 0

    // Downsampled sampling step for high performance
    const step = 4
    let sampledCount = 0

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / 3

      if (brightness >= 245) {
        brightPixelCount++
      }
      sampledCount++
    }

    // 1. Glare check: > 25% blown out pixels
    const glareRatio = brightPixelCount / sampledCount
    if (glareRatio > 0.25) {
      return '⚠️ Glare detected on paper. Adjust lighting or angle to prevent reflection.'
    }

    // 2. Blur check: Estimate contrast difference ratio
    let diffSum = 0
    for (let y = 1; y < height - 1; y += 4) {
      for (let x = 1; x < width - 1; x += 4) {
        const idx = (y * width + x) * 4
        const rightIdx = (y * width + (x + 1)) * 4
        const val1 = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        const val2 = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3
        diffSum += Math.abs(val1 - val2)
      }
    }
    const avgDiff = diffSum / sampledCount
    if (avgDiff < 3.5) {
      return '⚠️ Image looks blurry. Please hold steady and retake for best OCR accuracy.'
    }

    return null
  }

  // Shutter Capture Action
  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, width, height)

    // Quality check
    const warning = analyzeQuality(ctx, width, height)
    setQualityWarning(warning)

    // Auto-crop overlay bounds (central 90% document crop area)
    const cropX = Math.round(width * 0.05)
    const cropY = Math.round(height * 0.05)
    const cropW = Math.round(width * 0.90)
    const cropH = Math.round(height * 0.90)

    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = cropW
    croppedCanvas.height = cropH
    const croppedCtx = croppedCanvas.getContext('2d')
    croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.92)
    setCurrentPreview(dataUrl)
  }

  const acceptCurrentPhoto = (addAnother = false) => {
    if (!currentPreview) return
    const updated = [...capturedPages, currentPreview]
    setCapturedPages(updated)
    setCurrentPreview(null)
    setQualityWarning(null)

    if (!addAnother) {
      finishCaptureSession(updated)
    }
  }

  const retakeCurrentPhoto = () => {
    setCurrentPreview(null)
    setQualityWarning(null)
  }

  // Convert captured data URLs to a File object for the OCR upload route
  const finishCaptureSession = async (pages = capturedPages) => {
    if (pages.length === 0) return
    const primaryDataUrl = pages[0]
    
    // Fetch base64 data and convert to File
    const res = await fetch(primaryDataUrl)
    const blob = await res.blob()
    const file = new File([blob], `lab_report_camera_${Date.now()}.jpg`, { type: 'image/jpeg' })

    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    onCaptureComplete(file, pages.length)
  }

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📷</span> Mobile Document Scanner
          </h3>
          <p className="text-[11px] text-slate-400">Align document within frame & ensure clear lighting.</p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
        >
          ✕ Cancel
        </button>
      </div>

      {cameraError ? (
        <div className="bg-rose-950/50 border border-rose-800 p-4 rounded-2xl text-xs text-rose-300 space-y-2">
          <p className="font-bold">{cameraError}</p>
          <p className="text-[11px] text-rose-400">You can switch back to standard file upload anytime.</p>
        </div>
      ) : currentPreview ? (
        /* Preview Screen */
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 bg-black max-h-[380px] flex items-center justify-center">
            <img src={currentPreview} alt="Captured Lab Report" className="max-h-[360px] object-contain" />
          </div>

          {/* Quality Heuristic Warnings */}
          {qualityWarning && (
            <div className="bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs p-3 rounded-2xl font-medium flex items-center justify-between">
              <span>{qualityWarning}</span>
              <button
                onClick={retakeCurrentPhoto}
                className="text-[11px] font-bold bg-amber-500 text-black px-2.5 py-1 rounded-lg ml-2"
              >
                Retake
              </button>
            </div>
          )}

          {/* Page Count Counter */}
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Pages captured in session: <b>{capturedPages.length + 1}</b></span>
          </div>

          {/* Preview Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={retakeCurrentPhoto}
              className="py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              🔄 Retake Photo
            </button>
            <button
              onClick={() => acceptCurrentPhoto(true)}
              className="py-2 px-3 rounded-xl border border-primary/40 bg-primary/20 hover:bg-primary/30 text-xs font-bold text-primary-light"
            >
              ➕ Add Another Page
            </button>
            <button
              onClick={() => acceptCurrentPhoto(false)}
              className="btn-primary justify-center text-xs py-2"
            >
              ✅ Use Photo for OCR
            </button>
          </div>
        </div>
      ) : (
        /* Live Camera Feed Screen */
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black max-h-[400px] flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[400px] object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Document Frame Guide Overlay */}
            <div className="absolute inset-4 border-2 border-dashed border-primary/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between text-[10px] font-mono text-primary-light bg-black/50 px-2 py-0.5 rounded w-fit">
                DOCUMENT FRAME
              </div>
              <div className="text-[10px] text-center text-slate-300 bg-black/60 py-1 rounded-lg backdrop-blur-xs">
                Keep report flat, bright & centered
              </div>
            </div>
          </div>

          {/* Shutter Controls */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400 font-mono">
              Captured: {capturedPages.length} page(s)
            </span>

            <button
              onClick={takePhoto}
              className="w-14 h-14 rounded-full bg-primary border-4 border-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              title="Capture Photo"
            >
              <div className="w-8 h-8 rounded-full bg-white/20" />
            </button>

            {capturedPages.length > 0 ? (
              <button
                onClick={() => finishCaptureSession()}
                className="btn-primary text-xs py-2 px-3"
              >
                Done ({capturedPages.length})
              </button>
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
