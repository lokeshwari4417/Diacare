import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function PatientTablePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const base = user.role === 'ngo' ? '/ngo' : '/doctor'
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')

  useEffect(() => {
    api.listPatients().then(setPatients).finally(() => setLoading(false))
  }, [])

  const filtered = patients
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'reports') return (b.report_count || 0) - (a.report_count || 0)
      if (sortKey === 'risk') return (b.latest_risk_band || '').localeCompare(a.latest_risk_band || '')
      return 0
    })

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">{t('nav.patients')}</h1>
          <p className="text-muted text-sm mt-1">{user.role === 'ngo' ? t('patients.ngoSubtitle') : t('patients.doctorSubtitle')}</p>
        </div>
        <Link to={`${base}/new-patient`} className="btn-primary text-sm">{t('patients.createProfile')}</Link>
      </div>

      <div className="glass-card">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            className="input-field max-w-xs border-primary/10 focus:border-primary" placeholder={t('patients.searchPlaceholder')}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input-field w-auto border-primary/10 focus:border-primary py-2 px-3 pr-8 font-semibold" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="name">{t('patients.sortName')}</option>
            <option value="reports">{t('patients.sortScreenings')}</option>
            <option value="risk">{t('patients.sortRisk')}</option>
          </select>
        </div>

        {loading && <div className="text-center text-muted py-8">{t('screening.scanning')}</div>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-primary/5">
                  <th className="py-2.5 pr-3 font-semibold">{t('auth.name')}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t('patients.contact')}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t('patients.screenings')}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t('patients.latestRisk')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const hasRisk = !!p.latest_risk_band
                  const isLow = p.latest_risk_band === 'low'
                  const isMod = p.latest_risk_band === 'moderate'
                  const riskColorClass = !hasRisk 
                    ? 'text-muted bg-slate-100 border-slate-200' 
                    : isLow 
                    ? 'text-risk-low bg-risk-lowBg border-emerald-500/10' 
                    : isMod 
                    ? 'text-risk-moderate bg-risk-moderateBg border-amber-500/10' 
                    : 'text-risk-high bg-risk-highBg border-red-500/10'

                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`${base}/patient/${p.id}`)}
                      className="border-b border-primary/5 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-all"
                    >
                      <td className="py-3.5 pr-3 font-semibold text-ink">
                        <span className="hover:text-primary">{p.name}</span>
                      </td>
                      <td className="py-3.5 pr-3 text-muted font-medium">{p.email}</td>
                      <td className="py-3.5 pr-3 font-semibold text-ink/70">{p.report_count}</td>
                      <td className="py-3.5 pr-3">
                        {p.latest_risk_band ? (
                          <span className={`pill ${riskColorClass} border font-bold capitalize`}>{t(`risk.${p.latest_risk_band}`)}</span>
                        ) : (
                          <span className="text-muted text-xs font-semibold">{t('patients.noScreenings')}</span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted font-semibold">{t('patients.noPatients')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
