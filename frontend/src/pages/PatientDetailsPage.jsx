import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function PatientDetailsPage() {
  const { t } = useTranslation()
  const { patientId } = useParams()
  const { user } = useAuth()
  const base = user.role === 'ngo' ? '/ngo' : '/doctor'
  const [patient, setPatient] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getPatient(patientId), api.getPatientReports(patientId)])
      .then(([p, r]) => { setPatient(p); setReports(r) })
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) return <div className="text-center text-muted py-12">{t('screening.scanning')}</div>
  if (!patient) return <div className="text-center text-risk-high py-12 bg-risk-highBg max-w-md mx-auto border border-risk-high/10 rounded-2xl">Patient not found.</div>

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">{patient.name}</h1>
          <p className="text-muted text-sm mt-1">{patient.email} {patient.mobile && `\u00b7 ${patient.mobile}`}</p>
        </div>
        <Link to={`${base}/patient/${patientId}/new-scan`} className="btn-primary text-sm">{t('patients.newScanBtn')}</Link>
      </div>

      {patient.information && (
        <div className="glass-card">
          <h3 className="text-sm font-semibold text-ink/70 mb-1.5">{t('patient.infoLabel')}</h3>
          <p className="text-sm text-ink/80 leading-relaxed font-medium">{patient.information}</p>
        </div>
      )}

      <div className="glass-card">
        <h3 className="text-lg font-semibold text-ink mb-4">{t('patients.historyTitle')}</h3>
        {reports.length === 0 && <p className="text-sm text-muted font-semibold">{t('patients.noHistory')}</p>}
        <div className="space-y-3">
          {reports.map((r, i) => {
            const hasRisk = !!r.risk_band
            const isLow = r.risk_band === 'low'
            const isMod = r.risk_band === 'moderate'
            const riskColorClass = !hasRisk 
              ? 'text-muted bg-slate-100 border-slate-200' 
              : isLow 
              ? 'text-risk-low bg-risk-lowBg border-emerald-500/10' 
              : isMod 
              ? 'text-risk-moderate bg-risk-moderateBg border-amber-500/10' 
              : 'text-risk-high bg-risk-highBg border-red-500/10'

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`${base}/report/${r.id}`}
                  className="flex items-center justify-between rounded-xl border border-primary/5 px-4 py-3 bg-white hover:bg-slate-50/50 hover:shadow-soft transition-all"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{new Date(r.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted mt-1 font-medium">
                      {r.source === 'scan' ? t('history.scanLabel') : t('history.manualLabel')} &middot; {t(`status.${r.status}`)} &middot; {Math.round(r.probability * 100)}%
                    </p>
                  </div>
                  <span className={`pill ${riskColorClass} border font-bold capitalize`}>{t(`risk.${r.risk_band}`)}</span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
