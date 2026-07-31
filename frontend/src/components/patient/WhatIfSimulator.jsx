import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api'

const SLIDERS = [
  { key: 'glucose', labelKey: 'clinical.glucose', unit: 'mg/dL', min: 0, max: 200, step: 1 },
  { key: 'bmi', labelKey: 'clinical.bmi', unit: 'kg/m\u00b2', min: 0, max: 67, step: 0.1 },
  { key: 'blood_pressure', labelKey: 'clinical.blood_pressure', unit: 'mm Hg', min: 0, max: 122, step: 1 },
]

export default function WhatIfSimulator({ baseInputs, baseProbability }) {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    glucose: baseInputs.glucose, bmi: baseInputs.bmi, blood_pressure: baseInputs.blood_pressure,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  const runSimulation = useCallback((feature, value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.simulate({
          base: baseInputs, modified_feature: feature, modified_value: Number(value),
        })
        setResult(res)
      } catch (_) {
        /* silently ignore -- simulator is a nice-to-have */
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [baseInputs])

  const onSlide = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }))
    runSimulation(key, value)
  }

  const delta = result ? result.delta_percentage_points : 0
  const activeProb = result ? result.probability : baseProbability

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-1 text-ink">{t('result.whatif')}</h3>
      <p className="text-sm text-muted mb-5">
        {t('result.whatifDesc')}
      </p>

      <div className="space-y-5">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-ink/80">{t(s.labelKey)}</span>
              <span className="text-muted font-medium">{values[s.key]} {s.unit}</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} step={s.step}
              value={values[s.key]}
              onChange={(e) => onSlide(s.key, e.target.value)}
              className="w-full accent-primary bg-slate-100 rounded-lg appearance-none h-2 cursor-pointer focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 border border-primary/5 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <span className="text-sm text-ink/70 font-semibold">{t('result.simulated')}</span>
        <div className="text-right flex items-center gap-2">
          <motion.span 
            key={activeProb}
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-display font-bold text-ink"
          >
            {Math.round(activeProb * 100)}%
          </motion.span>
          <AnimatePresence mode="wait">
            {result && (
              <motion.span 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm font-semibold flex items-center ${delta <= 0 ? 'text-risk-low' : 'text-risk-high'}`}
              >
                {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(1)} {t('result.pts')}
              </motion.span>
            )}
          </AnimatePresence>
          {loading && <span className="text-xs text-muted font-medium animate-pulse">{t('result.updating')}</span>}
        </div>
      </div>
    </div>
  )
}
