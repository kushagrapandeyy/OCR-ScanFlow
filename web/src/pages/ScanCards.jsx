import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  X,
  ScanLine,
  RefreshCw,
  Zap,
  ZapOff,
  Focus,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FlipHorizontal,
  Trash2,
  CreditCard,
  FileOutput,
} from 'lucide-react'
import { useAppStore } from '../store'
import { useHaptics } from '../hooks/useHaptics'
import { analyzeFrame } from '../lib/scanner/frameAnalysis'
import { extractHighResCrop } from '../lib/scanner/imageProcessing'


// ─── Scan States ──────────────────────────────────────────────────────────────
const SCAN_STATES = {
  NO_CARD:  'no_card',
  FOCUSING: 'focusing',
  DARK:     'dark',
  BRIGHT:   'bright',
  OBSTRUCTED: 'obstructed',
  UNSTABLE: 'unstable',
  DETECTED: 'detected',
  CAPTURED: 'captured',
}

// ─── Camera Scanner ───────────────────────────────────────────────────────────
function CameraScanner({ onCapture, onClose }) {
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const streamRef     = useRef(null)
  const rafRef        = useRef(null)        // requestAnimationFrame id
  const countdownRef  = useRef(null)
  const autoCaptureRef = useRef(true)       // ref so analyzeFrame always sees fresh value
  const capturedRef   = useRef(false)       // prevent double-capture
  const readyFramesRef = useRef(0)
  const prevGraysRef  = useRef(null)
  const guideBoxRef   = useRef(null)

  const [scanState, setScanState]     = useState(SCAN_STATES.NO_CARD)
  const [autoCapture, setAutoCapture] = useState(true)
  const [countdown, setCountdown]     = useState(null)
  const [quality, setQuality]         = useState({ sharpness: 0, brightness: 0 })
  const [facingMode, setFacingMode]   = useState('environment')
  const [cameraError, setCameraError] = useState(null)
  const [isReady, setIsReady]         = useState(false)

  const haptics = useHaptics()

  // Keep ref in sync with state
  useEffect(() => { autoCaptureRef.current = autoCapture }, [autoCapture])

  useEffect(() => {
    capturedRef.current = false
    startCamera()
    return stopAll
  }, [facingMode])

  async function startCamera() {
    try {
      setCameraError(null)
      setIsReady(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.onloadedmetadata = () => {
        video.play().then(() => {
          setIsReady(true)
          startAnalysisLoop()
        })
      }
    } catch (err) {
      setCameraError(err.message || 'Camera access denied. Check browser permissions.')
    }
  }

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    clearCountdown()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  // Use rAF instead of setInterval for smooth frame sampling
  function startAnalysisLoop() {
    function loop() {
      // Analyze every frame for stability tracking
      performFrameAnalysis()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function performFrameAnalysis() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2 || capturedRef.current) return

    // Draw frame to a smaller 320x180 canvas for fast processing
    const sampleW = 320
    const sampleH = 180
    canvas.width  = sampleW
    canvas.height = sampleH
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, sampleW, sampleH)

    const imageData = ctx.getImageData(0, 0, sampleW, sampleH)
    
    // Pass to advanced CV heuristics
    const result = analyzeFrame(imageData, prevGraysRef.current)
    
    // Store grays for next frame's stability check
    prevGraysRef.current = result.grays

    if (!result.ok) {
      readyFramesRef.current = 0
      clearCountdown()
      if (result.reason === 'dark') setScanState(SCAN_STATES.DARK)
      else if (result.reason === 'bright') setScanState(SCAN_STATES.BRIGHT)
      else if (result.reason === 'obstructed') setScanState(SCAN_STATES.OBSTRUCTED)
      else if (result.reason === 'blurry') setScanState(SCAN_STATES.FOCUSING)
      else if (result.reason === 'unstable') setScanState(SCAN_STATES.UNSTABLE)
      else setScanState(SCAN_STATES.NO_CARD)
    } else {
      setScanState(SCAN_STATES.DETECTED)
      guideBoxRef.current = result.box
      
      readyFramesRef.current++
      
      // Auto-capture after ~20 consecutive perfect frames
      if (autoCaptureRef.current && readyFramesRef.current >= 20) {
        triggerCapture()
      } else if (autoCaptureRef.current && readyFramesRef.current === 1) {
        // Just visual countdown feedback, the actual trigger happens on 20 frames
        startCountdownIfNeeded()
      }
    }
  }

  function startCountdownIfNeeded() {
    if (countdownRef.current || capturedRef.current) return
    let count = 3
    setCountdown(count)
    haptics.tap()
    countdownRef.current = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearCountdown()
        triggerCapture()
      }
    }, 1000)
  }

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(null)
  }

  const triggerCapture = useCallback(() => {
    const video  = videoRef.current
    if (!video || capturedRef.current) return
    capturedRef.current = true

    let imageData;
    // Tightly crop the high-res image based on the detected guide box
    if (guideBoxRef.current) {
      imageData = extractHighResCrop(video, guideBoxRef.current, video.videoWidth / 320)
    } else {
      // Fallback
      const canvas = document.createElement('canvas')
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      imageData = canvas.toDataURL('image/jpeg', 0.95)
    }

    haptics.capture()
    setScanState(SCAN_STATES.CAPTURED)
    stopAll()
    onCapture(imageData)
  }, [haptics, onCapture])

  function handleManualCapture() {
    clearCountdown()
    triggerCapture()
  }

  function flipCamera() {
    stopAll()
    setIsReady(false)
    setFacingMode(m => m === 'environment' ? 'user' : 'environment')
  }

  // UI text per state
  const statusMap = {
    [SCAN_STATES.NO_CARD]:  { msg: 'Point camera at a business card', color: 'rgba(255,255,255,0.85)' },
    [SCAN_STATES.DARK]:     { msg: 'Too dark — move to better light', color: 'var(--orange)' },
    [SCAN_STATES.BRIGHT]:   { msg: 'Too bright — avoid direct glare', color: 'var(--orange)' },
    [SCAN_STATES.FOCUSING]: { msg: 'Hold still — card needs to be sharper', color: 'var(--yellow)' },
    [SCAN_STATES.UNSTABLE]: { msg: 'Hold still — motion detected', color: 'var(--orange)' },
    [SCAN_STATES.OBSTRUCTED]: { msg: 'Move hands/fingers away from card', color: 'var(--red)' },
    [SCAN_STATES.DETECTED]: { msg: autoCapture ? `Scanning perfectly...` : 'Card detected! Tap capture', color: 'var(--teal)' },
    [SCAN_STATES.CAPTURED]: { msg: 'Captured!', color: 'var(--teal)' },
  }

  const statusCfg = statusMap[scanState]
  const statusMsg = statusCfg?.msg || ''

  // Visual cues for quality indicator (just decorative now)
  const sharpLabel = 'Active'
  const sharpClass = quality.sharpness > 12 ? 'q-good' : quality.sharpness > 6 ? 'q-warn' : 'q-bad'
  const brightLabel = quality.brightness > 50 && quality.brightness < 235 ? 'Good light' : quality.brightness <= 50 ? 'Too dark' : 'Too bright'
  const brightClass = quality.brightness > 50 && quality.brightness < 235 ? 'q-good' : 'q-warn'

  if (cameraError) {
    return (
      <div className="camera-overlay" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, flexDirection: 'column', padding: 32 }}>
        <AlertCircle size={52} style={{ color: 'var(--red)' }} />
        <h3 style={{ color: 'white', textAlign: 'center' }}>Camera Access Required</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
          {cameraError}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.8rem', maxWidth: 280 }}>
          Click the camera icon in the address bar and allow access, then refresh.
        </p>
        <button className="btn btn-secondary" onClick={onClose}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="camera-overlay">
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 16px)', right: 16,
          zIndex: 10, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: 'white',
        }}
      >
        <X size={20} />
      </button>

      {/* Video */}
      <div className="camera-view">
        <video
          ref={videoRef}
          className="camera-video"
          playsInline muted autoPlay
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Guide overlay */}
        <div className="camera-guide">
          <div className="camera-hint">💡 Hold card flat · Good lighting · No glare</div>

          <div className={`card-frame ${scanState === SCAN_STATES.DETECTED ? 'detected' : ''}`}>
            <div className="corner-br" />
            <div className="corner-bl" />

            {/* Countdown */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  className="countdown-ring"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                >
                  <motion.div
                    className="countdown-number"
                    key={countdown}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    {countdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status pill */}
          <motion.div
            className="camera-status"
            animate={{ color: statusCfg?.color || 'white', borderColor: `${statusCfg?.color || 'white'}30` }}
            transition={{ duration: 0.3 }}
          >
            {scanState === SCAN_STATES.DETECTED && <CheckCircle size={14} />}
            {scanState === SCAN_STATES.FOCUSING && <Focus size={14} />}
            {scanState === SCAN_STATES.NO_CARD  && <ScanLine size={14} />}
            {statusMsg}
          </motion.div>
        </div>

        {/* Quality indicators */}
        <div className="quality-indicators">
          <div className={`quality-pill ${sharpClass}`}>
            <div className="quality-dot" />
            {sharpLabel}
          </div>
          <div className={`quality-pill ${brightClass}`}>
            <div className="quality-dot" />
            {brightLabel}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="camera-controls">
        <button className="toggle-autocapture" onClick={flipCamera}>
          <FlipHorizontal size={18} />
          <span>Flip</span>
        </button>

        <motion.button
          className={`capture-btn ${countdown !== null ? 'counting' : ''}`}
          onClick={handleManualCapture}
          whileTap={{ scale: 0.88 }}
          disabled={!isReady}
        >
          <Camera size={28} color="#000" />
        </motion.button>

        <button
          className={`toggle-autocapture ${autoCapture ? 'active' : ''}`}
          onClick={() => {
            const next = !autoCapture
            setAutoCapture(next)
            autoCaptureRef.current = next
            if (!next) clearCountdown()
            haptics.tap()
          }}
        >
          {autoCapture ? <Zap size={18} /> : <ZapOff size={18} />}
          <span>Auto</span>
        </button>
      </div>
    </div>
  )
}

// ─── OCR Progress ─────────────────────────────────────────────────────────────
function OCRProgress({ progress, status }) {
  return (
    <div className="ocr-processing">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--teal)' }}
      />
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{status || 'Reading card…'}</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Gemini AI Processing</div>
      </div>
      <div className="ocr-progress-bar">
        <motion.div
          className="ocr-progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div style={{ color: 'var(--teal)', fontSize: '0.875rem', fontWeight: 600 }}>{progress}%</div>
    </div>
  )
}

// ─── Interaction Levels ───────────────────────────────────────────────────────
const INTERACTION_LEVELS = [
  { value: 'casual',   label: '💬 Casual Talk',       cls: 'selected-casual' },
  { value: 'decided',  label: '✅ Something Decided',  cls: 'selected-decided' },
  { value: 'followup', label: '🔔 Follow Up',          cls: 'selected-followup' },
  { value: 'other',    label: '⭐ Other',              cls: 'selected-other' },
]

// ─── Card Review Form ─────────────────────────────────────────────────────────
function CardReviewForm({ card, imageUrl, onSave, onRescan, onDiscard, sessionNum }) {
  const [form, setForm] = useState({
    first_name: card.first_name || '',
    last_name:  card.last_name  || '',
    title:      card.title      || '',
    company:    card.company    || '',
    email:      card.email      || '',
    phone:      card.phone      || '',
    website:    card.website    || '',
    linkedin:   card.linkedin   || '',
    address:    card.address    || '',
    notes:      card.notes      || '',
    interaction_level: 'casual',
    event_name: '',
    // CRM-required fields
    category:     card.category      || '',
    country:      card.country       || '',
    mobile_prefix: card.mobile_prefix || '',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const haptics = useHaptics()

  return (
    <div className="page-wrapper" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800 }}>
              Review Card {sessionNum ? `#${sessionNum}` : ''}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verify extracted data before saving</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onRescan}>
              <RefreshCw size={13} /> Rescan
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDiscard}>
              <Trash2 size={13} /> Discard
            </button>
          </div>
        </div>

        {/* Confidence indicator */}
        {card.confidence != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OCR Confidence</span>
            <div className="confidence-bar" style={{ width: 120 }}>
              <div
                className="confidence-fill"
                style={{
                  width: `${card.confidence}%`,
                  background: card.confidence > 65 ? 'var(--green)' : card.confidence > 35 ? 'var(--orange)' : 'var(--red)',
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {card.confidence}%
            </span>
            {card.confidence === 0 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--orange)' }}>
                — Please fill in fields manually
              </span>
            )}
          </div>
        )}
      </div>

      <div className="scan-review-layout">
        {/* Left: image + interaction */}
        <div>
          <div className="scan-card-preview">
            <div className="scan-card-image">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Scanned card"
                  style={{ transform: 'scaleX(-1)', width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <CreditCard size={32} />
                  <span style={{ fontSize: '0.75rem' }}>No image</span>
                </div>
              )}
            </div>
          </div>

          {/* Raw OCR text (debug aid) */}
          {card.raw_text && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Raw OCR text
              </summary>
              <div style={{
                marginTop: 6, padding: '8px 10px', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto', userSelect: 'text',
              }}>
                {card.raw_text || '(empty)'}
              </div>
            </details>
          )}

          {/* Interaction Level */}
          <div style={{ marginTop: 16 }}>
            <div className="form-label">Interaction Level</div>
            <div className="interaction-level-grid">
              {INTERACTION_LEVELS.map(level => (
                <motion.button
                  key={level.value}
                  className={`interaction-level-btn ${form.interaction_level === level.value ? level.cls : ''}`}
                  onClick={() => { setForm(f => ({ ...f, interaction_level: level.value })); haptics.tap() }}
                  whileTap={{ scale: 0.96 }}
                >
                  {level.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="form-label">Event / Context</div>
            <input className="form-input" placeholder="e.g. CES 2026…" value={form.event_name} onChange={set('event_name')} />
          </div>
        </div>

        {/* Right: fields */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            {[
              { k: 'first_name', label: 'First Name', ph: 'John' },
              { k: 'last_name',  label: 'Last Name',  ph: 'Doe'  },
            ].map(({ k, label, ph }) => (
              <div className="form-group" key={k}>
                <div className="form-label">{label}</div>
                <input className="form-input" placeholder={ph} value={form[k]} onChange={set(k)} />
              </div>
            ))}
          </div>

          {[
            { k: 'title',   label: 'Designation / Role',  ph: 'Sales Manager',       type: 'text' },
            { k: 'company', label: 'Company',              ph: 'Acme Inc.',           type: 'text' },
            { k: 'email',   label: 'Email ✱✱',             ph: 'john@acme.com',       type: 'email' },
            { k: 'phone',   label: 'Phone',                ph: '+1 555 000 0000',     type: 'tel' },
            { k: 'website', label: 'Website',              ph: 'acme.com',            type: 'text' },
            { k: 'linkedin',label: 'LinkedIn',             ph: 'linkedin.com/in/...', type: 'text' },
            { k: 'address', label: 'Address',              ph: 'City, State',         type: 'text' },
          ].map(({ k, label, ph, type }) => (
            <div className="form-group" key={k}>
              <div className="form-label">{label}</div>
              <input className="form-input" type={type} placeholder={ph} value={form[k]} onChange={set(k)} />
            </div>
          ))}

          {/* CRM-required fields */}
          <div
            style={{
              background: 'var(--teal-glow)',
              border: '1px solid var(--teal-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 10,
              fontSize: '0.75rem',
              color: 'var(--teal)',
              fontWeight: 600,
            }}
          >
            ✱✱ Required by your CRM
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0 10px' }}>
            <div className="form-group">
              <div className="form-label">Prefix</div>
              <select className="form-input" value={form.mobile_prefix} onChange={set('mobile_prefix')} style={{ padding: '10px 8px' }}>
                <option value="">—</option>
                {['+1','+44','+91','+61','+49','+971','+65','+852','+33','+81','+86'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <div className="form-label">Mobile Number</div>
              <input className="form-input" type="tel" placeholder="555 000 0000" value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
            <div className="form-group">
              <div className="form-label">Country ✱✱</div>
              <select className="form-input" value={form.country} onChange={set('country')} style={{ padding: '10px 8px' }}>
                <option value="">Select country</option>
                {[['US','United States'],['IN','India'],['GB','United Kingdom'],['AE','UAE'],['AU','Australia'],['CA','Canada'],['SG','Singapore'],['DE','Germany'],['HK','Hong Kong'],['FR','France'],['JP','Japan'],['CN','China']].map(([code,name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <div className="form-label">Category ✱✱</div>
              <select className="form-input" value={form.category} onChange={set('category')} style={{ padding: '10px 8px' }}>
                <option value="">Select category</option>
                {['Technology','Sales','Marketing','Finance','Real Estate','Education','Healthcare','Legal','Creative','Consulting','Operations','Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <div className="form-label">Additional Notes</div>
            <textarea className="form-input" placeholder="Add context or notes…" value={form.notes} onChange={set('notes')} rows={3} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <motion.button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { haptics.success(); onSave({ ...form, image_front: imageUrl }) }}
              whileTap={{ scale: 0.97 }}
            >
              <CheckCircle size={16} /> Save Card
            </motion.button>
            <motion.button
              className="btn btn-secondary"
              onClick={() => { haptics.tap(); onSave({ ...form, image_front: imageUrl }, true) }}
              whileTap={{ scale: 0.97 }}
            >
              Save & Next <ChevronRight size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ScanCards Page ──────────────────────────────────────────────────────
export default function ScanCards() {
  const navigate   = useNavigate()
  const haptics    = useHaptics()
  const addScan    = useAppStore(s => s.addScan)
  const updateScan = useAppStore(s => s.updateScan)
  const addToast   = useAppStore(s => s.addToast)

  const [showCamera,     setShowCamera]     = useState(false)
  const [capturedImage,  setCapturedImage]  = useState(null)
  const [extractedCard,  setExtractedCard]  = useState(null)
  const [ocrProgress,    setOcrProgress]    = useState(0)
  const [ocrStatus,      setOcrStatus]      = useState('')
  const [isProcessing,   setIsProcessing]   = useState(false)
  const [eventName,      setEventName]      = useState('')
  const [sessionCards,   setSessionCards]   = useState([])

  const handleCapture = async (imageData) => {
    setCapturedImage(imageData)
    setShowCamera(false)
    setIsProcessing(true)
    setOcrProgress(10)
    setOcrStatus('Uploading to Cloudinary...')

    try {
      // 1. Upload to Cloudinary
      const res = await fetch(imageData)
      const blob = await res.blob()

      setOcrProgress(30)
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset'
      const formData = new FormData()
      formData.append('file', blob)
      formData.append('upload_preset', uploadPreset)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })
      if (!uploadRes.ok) throw new Error('Failed to upload image securely')
      const cloudData = await uploadRes.json()
      const secureUrl = cloudData.secure_url

      // 2. Create Scan Record
      setOcrStatus('Card saved. Queuing AI extraction...')
      setOcrProgress(50)
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      
      // Need a proper token for API call, assuming there's an auth flow or just using a dummy for now
      // If we don't have token, the backend might reject unless we mock auth or have token in store
      const token = localStorage.getItem('token') || '' // Fallback
      
      const scanRes = await fetch(`${API_URL}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
        body: JSON.stringify({
          cloudinary_original_url: secureUrl,
          cloudinary_processed_url: secureUrl,
          batch_id: 'auto'
        })
      })
      
      if (!scanRes.ok) throw new Error('Failed to save scan record')
      const scanData = await scanRes.json()
      const scanId = scanData.id

      // 3. Trigger Extraction
      setOcrProgress(60)
      await fetch(`${API_URL}/api/scans/${scanId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) }
      })

      setOcrStatus('Extracting details securely...')
      
      // 4. Poll Status
      let isDone = false
      let finalContact = null
      let attempts = 0
      
      while (!isDone && attempts < 20) { // Max 1 minute polling (3s * 20)
        attempts++
        await new Promise(r => setTimeout(r, 3000))
        
        const statusRes = await fetch(`${API_URL}/api/scans/${scanId}/extraction-status`, {
          headers: { ...(token ? {'Authorization': `Bearer ${token}`} : {}) }
        })
        const statusData = await statusRes.json()
        
        if (statusData.ai_status === 'queued_due_to_rate_limit') {
          setOcrStatus('AI extraction is queued due to current usage limits. You can continue scanning.')
          addToast({ type: 'info', title: 'Queued', message: 'Rate limit hit, extraction queued.' })
          break; // Stop blocking UI
        }
        if (statusData.ai_status === 'skipped_due_to_daily_limit') {
          setOcrStatus('AI limit reached for today. Your card has still been saved and can be reviewed manually.')
          addToast({ type: 'warning', title: 'Limit Reached', message: 'Daily limit hit. Manual review required.' })
          break; // Stop blocking UI
        }
        
        if (statusData.status === 'extraction_completed' || statusData.status === 'manual_review_required') {
          isDone = true
          // 5. Fetch Contact
          const contactRes = await fetch(`${API_URL}/api/scans/${scanId}/contact`, {
             headers: { ...(token ? {'Authorization': `Bearer ${token}`} : {}) }
          })
          if (contactRes.ok) {
            finalContact = await contactRes.json()
          }
        }
      }

      setOcrProgress(100)
      
      if (finalContact) {
        setOcrStatus('AI extraction completed. Please review the fields.')
        setExtractedCard({
          ...finalContact,
          first_name: finalContact.full_name?.split(' ')[0] || '',
          last_name: finalContact.full_name?.split(' ').slice(1).join(' ') || '',
          title: finalContact.designation || '',
          confidence: Math.round((finalContact.confidence_score || 0) * 100)
        })
        haptics.success()
      } else {
        setOcrStatus('Manual review required.')
        setExtractedCard({
          first_name: '', last_name: '', title: '', company: '',
          email: '', phone: '', website: '', linkedin: '',
          address: '', notes: '', raw_text: '', confidence: 0,
        })
        haptics.error()
      }

    } catch (err) {
      haptics.error()
      console.error('Scan Pipeline error:', err)
      addToast({ type: 'error', title: 'Pipeline Failed', message: err.message })
      setExtractedCard({
        first_name: '', last_name: '', title: '', company: '',
        email: '', phone: '', website: '', linkedin: '',
        address: '', notes: '', raw_text: '', confidence: 0,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveCard = (form, scanNext = false) => {
    // Determine the actual ID from the backend extraction if available
    const cardId = extractedCard?.scan_id || extractedCard?.id || Date.now().toString()
    
    const newCard = {
      id: cardId,
      ...form,
      event_name: eventName || form.event_name,
      tags: ['enriched'],
      created_at: new Date().toISOString(),
      exported_at: null,
      archived: false,
    }
    
    // Add to session display
    setSessionCards(prev => [...prev, newCard])
    haptics.success()
    addToast({ type: 'success', title: 'Card Saved!', message: `${form.first_name || 'Card'} ${form.last_name || ''} added to your library` })

    // Add to global scans store so it appears in Dashboard and All Cards immediately
    addScan(newCard)

    // Use updateScan to sync the user's manual review edits to the backend
    updateScan(cardId, { ...form, event_name: newCard.event_name })

    setCapturedImage(null)
    setExtractedCard(null)
    if (scanNext) {
      navigate('/cards')
    }
  }

  return (
    <>
      {/* Camera overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          >
            <CameraScanner
              onCapture={handleCapture}
              onClose={() => setShowCamera(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCR Processing */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          >
            <OCRProgress progress={ocrProgress} status={ocrStatus} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Review */}
      {extractedCard ? (
        <CardReviewForm
          card={extractedCard}
          imageUrl={capturedImage}
          onSave={handleSaveCard}
          onRescan={() => { setCapturedImage(null); setExtractedCard(null); setShowCamera(true) }}
          onDiscard={() => { setCapturedImage(null); setExtractedCard(null) }}
          sessionNum={sessionCards.length + 1}
        />
      ) : (
        /* Main scan page */
        <div className="page-wrapper">
          <div className="page-header">
            <h1 className="page-title">Scan Business Cards</h1>
            <p className="page-subtitle">Capture cards with the live scanner, then enrich and save to your library</p>
          </div>

          {/* Event bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Event name (optional)"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              style={{ flex: 1 }}
            />
            <motion.button
              className="btn btn-primary"
              onClick={() => { haptics.tap(); setShowCamera(true) }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Camera size={16} /> Open Scanner
            </motion.button>
          </div>

          {/* Session cards */}
          {sessionCards.length > 0 ? (
            <div>
              <div className="section-header">
                <h3 className="section-title">
                  This Session — {sessionCards.length} card{sessionCards.length !== 1 ? 's' : ''}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/export')}>
                  <FileOutput size={13} /> Export All
                </button>
              </div>

              {sessionCards.map(card => (
                <div 
                  key={card.id} 
                  className="contact-card" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    haptics.tap()
                    navigate(`/cards/${card.id}`)
                  }}
                >
                  <div className="contact-thumbnail">
                    {card.image_front ? (
                      <img src={card.image_front} alt="" style={{ transform: 'scaleX(-1)' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', background: 'var(--bg-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'Outfit',
                      }}>
                        {card.first_name?.[0]}{card.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{card.first_name} {card.last_name}</div>
                    <div className="contact-title">{card.title}</div>
                    <div className="contact-meta">
                      {card.company && <span>{card.company}</span>}
                      {card.email && <span>{card.email}</span>}
                    </div>
                  </div>
                  <span className="badge badge-enriched">saved</span>
                </div>
              ))}

              <motion.button
                className="btn btn-primary"
                style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                onClick={() => { haptics.tap(); setShowCamera(true) }}
                whileTap={{ scale: 0.97 }}
              >
                <Camera size={16} /> Scan Another Card
              </motion.button>
            </div>
          ) : (
            <div className="empty-state">
              <motion.div
                className="empty-icon"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              >
                <ScanLine size={32} />
              </motion.div>
              <div className="empty-title">No cards yet</div>
              <p className="empty-subtitle">Open the scanner to capture your first card</p>
              <motion.button
                className="btn btn-primary"
                onClick={() => { haptics.tap(); setShowCamera(true) }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                style={{ marginTop: 8 }}
              >
                <Camera size={16} /> Open Scanner
              </motion.button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
