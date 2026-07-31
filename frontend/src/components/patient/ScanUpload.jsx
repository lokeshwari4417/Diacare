import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api'

/**
 * Upload a lab report / checkup photo. Wired to /scan, which is
 * currently a MOCK (AI INTEGRATION POINT #2, see backend/app/scan_service.py).
 * The image is never persisted -- only the extracted values (after the
 * user reviews and confirms them) move on to submission.
 */
export default function ScanUpload({ onExtracted }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const res = await api.scan(file)
      onExtracted(res)
    } catch (err) {
      setError(err.message)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        whileHover={{ scale: 1.005, borderColor: 'var(--color-primary, #2563EB)' }}
        whileTap={{ scale: 0.995 }}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!loading) handleFile(e.dataTransfer.files[0]) }}
        className={`border-2 border-dashed border-primary/20 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-primary-light/20 transition-colors relative overflow-hidden flex flex-col items-center justify-center min-h-[180px] ${
          loading ? 'pointer-events-none' : ''
        }`}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center justify-center space-y-4"
            >
              {/* Scanning visual effect */}
              <div className="relative w-44 h-24 border border-primary/10 rounded-xl bg-white overflow-hidden flex flex-col justify-around p-3 shadow-sm">
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent z-10"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                />
                <div className="h-2 w-3/4 bg-slate-100 rounded animate-pulse" />
                <div className="h-2 w-1/2 bg-slate-100 rounded animate-pulse" />
                <div className="h-2 w-5/6 bg-slate-100 rounded animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                {t('screening.scanning')}
              </p>
            </motion.div>
          ) : preview ? (
            <motion.img
              key="preview"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={preview}
              alt="Uploaded report preview"
              className="max-h-44 rounded-xl object-contain shadow-soft"
            />
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <UploadIcon />
              <p className="text-sm font-semibold text-ink/80 mt-3">{t('screening.scanDrop')}</p>
              <p className="text-xs text-muted mt-1">{t('screening.scanBrowse')}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <input
          ref={inputRef} type="file" accept="image/*" className="hidden"
          disabled={loading}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </motion.div>
      {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}
    </div>
  )
}

function UploadIcon() {
  return (
    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary/70">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </div>
  )
}
