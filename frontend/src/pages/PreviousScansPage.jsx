import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function PreviousScansPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPatientReports(user.id).then(setReports).finally(() => setLoading(false))
  }, [user.id])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">{t('history.title')}</h1>
        <p className="text-muted text-sm mt-1">{t('history.subtitle')}</p>
      </div>

      {loading && <div className="text-center text-muted py-8">{t('screening.scanning')}</div>}

      {!loading && reports.length === 0 && (
        <div className="glass-card text-center py-12">
          <p className="text-ink/70 font-semibold">{t('history.empty')}</p>
          <Link to="/patient" className="btn-primary inline-block mt-4">{t('history.startBtn')}</Link>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r, i) => {
          const isLow = r.risk_band === 'low'
          const isMod = r.risk_band === 'moderate'
          const isHigh = r.risk_band === 'high'
          const riskColorClass = isLow 
            ? 'text-risk-low bg-risk-lowBg border-emerald-500/10' 
            : isMod 
            ? 'text-risk-moderate bg-risk-moderateBg border-amber-500/10' 
            : 'text-risk-high bg-risk-highBg border-red-500/10'

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/patient/report/${r.id}`}
                className="card flex items-center justify-between hover:shadow-soft border-primary/5 hover:border-primary/10 transition-all p-5"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted mt-1 font-medium">
                    {r.source === 'scan' ? t('history.scanLabel') : t('history.manualLabel')} &middot; {Math.round(r.probability * 100)}% {t('result.estimated')}
                  </p>
                </div>
                <span className={`pill ${riskColorClass} border font-bold capitalize`}>
                  {t(`risk.${r.risk_band}`)}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
