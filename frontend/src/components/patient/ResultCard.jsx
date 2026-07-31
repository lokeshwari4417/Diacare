import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const BAND_META = {
  low: { color: 'text-risk-low', bg: 'bg-risk-lowBg', ring: '#10B981' },
  moderate: { color: 'text-risk-moderate', bg: 'bg-risk-moderateBg', ring: '#F59E0B' },
  high: { color: 'text-risk-high', bg: 'bg-risk-highBg', ring: '#EF4444' },
}

export default function ResultCard({ probability, riskBand, summary }) {
  const { t } = useTranslation()
  const meta = BAND_META[riskBand] || BAND_META.low
  const pct = Math.round(probability * 100)

  // Animated percentage counting up
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const end = pct
    if (start === end) return
    const duration = 0.8
    const stepTime = Math.abs(Math.floor((duration * 1000) / end))
    const timer = setInterval(() => {
      start += 1
      setCount(start)
      if (start >= end) clearInterval(timer)
    }, stepTime)
    return () => clearInterval(timer)
  }, [pct])

  return (
    <div className={`card ${meta.bg} flex flex-col sm:flex-row items-center gap-6 border-primary/5 p-6`}>
      <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full animate-breathe"
          style={{ background: `radial-gradient(circle, ${meta.ring}22 0%, transparent 70%)` }}
        />
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="8" />
          <motion.circle
            cx="64" cy="64" r="54" fill="none" stroke={meta.ring} strokeWidth="8" strokeLinecap="round"
            initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - probability) }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeDasharray={2 * Math.PI * 54}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-display font-bold text-ink">{count}%</span>
          <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{t('result.estimated')}</span>
        </div>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <span className={`pill ${meta.bg} ${meta.color} border`} style={{ borderColor: meta.ring }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.ring }} />
          {t(`risk.${riskBand}`)}
        </span>
        <p className="mt-2 text-ink/85 leading-relaxed font-medium">{summary}</p>
        {riskBand !== 'low' && (
          <div className="mt-3 rounded-xl bg-white/70 border border-primary/5 px-4 py-3 text-sm text-ink/80 shadow-sm">
            {t('result.followup')}
          </div>
        )}
      </div>
    </div>
  )
}
