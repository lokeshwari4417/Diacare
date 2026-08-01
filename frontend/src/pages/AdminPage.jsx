import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'

export default function AdminPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  // Creation form state
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'patient', mobile: '', password: '' })
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Password reset popup state
  const [tempPassword, setTempPassword] = useState('')
  const [tempResetUser, setTempResetUser] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([api.listUsers(), api.adminStats()])
      .then(([u, s]) => { setUsers(u); setStats(s) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleActive = async (u) => {
    setBusyId(u.id)
    try {
      if (u.is_active) await api.deactivateUser(u.id)
      else await api.reactivateUser(u.id)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const handleResetPassword = async (u) => {
    setBusyId(u.id)
    try {
      const res = await api.resetUserPassword(u.id)
      setTempPassword(res.temp_password)
      setTempResetUser(u)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleApprove = async (u) => {
    setBusyId(u.id)
    try {
      await api.approveUser(u.id)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (u) => {
    if (!confirm(`Are you sure you want to reject ${u.name}'s request?`)) return
    setBusyId(u.id)
    try {
      await api.rejectUser(u.id)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')
    try {
      await api.createUser(form)
      setCreateSuccess(t('admin.onboardSuccess'))
      setForm({ name: '', email: '', role: 'patient', mobile: '', password: '' })
      load()
      setTimeout(() => setShowCreate(false), 1200)
    } catch (err) {
      setCreateError(err.message)
    }
  }

  const filtered = filter === 'all'
    ? users.filter((u) => u.status !== 'pending')
    : filter === 'pending'
      ? users.filter((u) => u.status === 'pending')
      : users.filter((u) => u.role === filter && u.status !== 'pending')


  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">{t('admin.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('admin.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          {t('admin.onboardBtn')}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label={t('admin.totalUsers')} value={stats.total_users} />
          <StatCard label={t('patients.screenings')} value={stats.total_screenings} />
          <StatCard label={t('nav.patients')} value={stats.total_patients} />
          <StatCard label={t('admin.clinicians')} value={stats.total_doctors + stats.total_ngo_workers} />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SVG Donut Chart for User Roles */}
          <RoleChart stats={stats} />

          {/* Segmented Risk Band bar chart */}
          <RiskDistributionChart stats={stats} />
        </div>
      )}

      <div className="glass-card">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
          {['all', 'pending', 'patient', 'doctor', 'ngo', 'admin'].map((r) => (
            <button
              key={r} onClick={() => setFilter(r)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filter === r ? 'bg-primary-light text-primary' : 'text-muted hover:bg-slate-50'
              }`}
            >
              {r === 'all' ? t('admin.all') : r === 'pending' ? 'Access Requests' : t(`auth.role.${r}`)}
            </button>
          ))}
        </div>


        {loading ? (
          <div className="text-center text-muted py-8">{t('screening.scanning')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-primary/5">
                  <th className="py-2.5 pr-3 font-semibold">{t('auth.name')}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t('auth.email')}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t('admin.role')}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t('admin.status')}</th>
                  <th className="py-2.5 pr-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-primary/5 last:border-0 hover:bg-slate-50/50 transition-all"
                  >
                    <td className="py-3 pr-3 text-ink">
                      <div className="font-semibold">{u.name}</div>
                      {u.information && (
                        <div className="text-[10px] text-muted font-medium mt-0.5 max-w-[200px] truncate" title={u.information}>
                          {u.information}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-muted font-medium">{u.email}</td>
                    <td className="py-3 pr-3 text-ink/70 font-semibold">{t(`auth.role.${u.role}`)}</td>
                    <td className="py-3 pr-3">
                      <span className={`pill ${
                        u.status === 'pending'
                          ? 'text-amber-700 bg-amber-50 border border-amber-200/50'
                          : u.status === 'rejected'
                            ? 'text-risk-high bg-risk-highBg border border-risk-high/15'
                            : u.is_active
                              ? 'text-risk-low bg-risk-lowBg border border-black/5'
                              : 'text-risk-high bg-risk-highBg border border-black/5'
                      }`}>
                        {u.status === 'pending'
                          ? 'Pending Approval'
                          : u.status === 'rejected'
                            ? 'Rejected'
                            : u.is_active
                              ? t('admin.active')
                              : t('admin.deactivated')}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {u.status === 'pending' ? (
                        <div className="space-x-3">
                          <button
                            onClick={() => handleApprove(u)} disabled={busyId === u.id}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(u)} disabled={busyId === u.id}
                            className="text-xs font-bold text-risk-high hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="space-x-3">
                          <button
                            onClick={() => toggleActive(u)} disabled={busyId === u.id}
                            className={`text-xs font-semibold ${u.is_active ? 'text-risk-high hover:underline' : 'text-primary hover:underline'}`}
                          >
                            {u.is_active ? t('admin.deactivate') : t('admin.reactivate')}
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)} disabled={busyId === u.id}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {t('admin.resetPassword')}
                          </button>
                        </div>
                      )}
                    </td>

                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard User Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-soft border border-primary/5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-display font-bold text-ink">{t('admin.onboardTitle')}</h3>
                <button onClick={() => setShowCreate(false)} className="text-muted hover:text-ink font-semibold">✕</button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="label-text">{t('auth.name')}</label>
                  <input required className="input-field border-primary/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label-text">{t('auth.email')}</label>
                  <input type="email" required className="input-field border-primary/10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text">{t('admin.role')}</label>
                    <select className="input-field border-primary/10 font-semibold" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="patient">{t('auth.role.patient')}</option>
                      <option value="doctor">{t('auth.role.doctor')}</option>
                      <option value="ngo">{t('auth.role.ngo')}</option>
                      <option value="admin">{t('auth.role.admin')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-text">{t('auth.mobile')}</label>
                    <input className="input-field border-primary/10" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label-text">{t('profile.newPassword')}</label>
                  <input type="password" required className="input-field border-primary/10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                {createError && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/10 px-3 py-2 rounded-xl">{createError}</p>}
                {createSuccess && <p className="text-sm text-primary font-semibold">{createSuccess}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">{t('admin.modalClose')}</button>
                  <button type="submit" className="btn-primary text-sm">{t('admin.onboardBtn')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Temporary Display Modal */}
      <AnimatePresence>
        {tempPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-soft border border-primary/5 space-y-4"
            >
              <h3 className="text-lg font-display font-bold text-ink">{t('admin.resetSuccessTitle')}</h3>
              <p className="text-sm text-muted font-medium">
                {t('admin.resetSuccessDesc', { name: tempResetUser?.name })}
              </p>
              <div className="bg-slate-100 p-4 rounded-2xl font-mono text-center text-lg font-bold text-primary select-all">
                {tempPassword}
              </div>
              <p className="text-xs text-risk-high font-semibold bg-risk-highBg p-2.5 rounded-xl border border-risk-high/10">
                ⚠️ {t('admin.tempWarning')}
              </p>
              <div className="flex justify-end">
                <button onClick={() => setTempPassword('')} className="btn-primary text-sm">{t('admin.modalClose')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="card py-5 border-primary/5 hover:shadow-soft flex flex-col justify-center">
      <p className="text-2xl font-display font-bold text-primary">{value}</p>
      <p className="text-xs text-muted font-medium mt-1">{label}</p>
    </div>
  )
}

function RoleChart({ stats }) {
  const { t } = useTranslation()
  const patient = stats.total_patients || 0
  const doctor = stats.total_doctors || 0
  const ngo = stats.total_ngo_workers || 0
  const admin = stats.total_admins || 0
  const total = patient + doctor + ngo + admin || 1

  return (
    <div className="card flex items-center justify-between p-6 border-primary/5">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink/75 mb-3">{t('admin.userRoles')}</h3>
        <p className="text-xs font-semibold text-ink/80 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> {t('auth.role.patient')}: {patient}
        </p>
        <p className="text-xs font-semibold text-ink/80 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" /> {t('auth.role.doctor')}: {doctor}
        </p>
        <p className="text-xs font-semibold text-ink/80 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> {t('auth.role.ngo')}: {ngo}
        </p>
        <p className="text-xs font-semibold text-ink/80 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> {t('auth.role.admin')}: {admin}
        </p>
      </div>
      <svg width="100" height="100" viewBox="0 0 36 36" className="w-24 h-24 shrink-0 -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.915" fill="none" stroke="#2563EB" strokeWidth="3"
          strokeDasharray={`${(patient/total)*100} ${100 - (patient/total)*100}`} strokeDashoffset="0"
        />
        <circle
          cx="18" cy="18" r="15.915" fill="none" stroke="#06B6D4" strokeWidth="3"
          strokeDasharray={`${(doctor/total)*100} ${100 - (doctor/total)*100}`} strokeDashoffset={-((patient/total)*100)}
        />
        <circle
          cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3"
          strokeDasharray={`${(ngo/total)*100} ${100 - (ngo/total)*100}`} strokeDashoffset={-(((patient+doctor)/total)*100)}
        />
        <circle
          cx="18" cy="18" r="15.915" fill="none" stroke="#64748b" strokeWidth="3"
          strokeDasharray={`${(admin/total)*100} ${100 - (admin/total)*100}`} strokeDashoffset={-(((patient+doctor+ngo)/total)*100)}
        />
      </svg>
    </div>
  )
}

function RiskDistributionChart({ stats }) {
  const { t } = useTranslation()
  const low = stats.risk_band_distribution.low || 0
  const moderate = stats.risk_band_distribution.moderate || 0
  const high = stats.risk_band_distribution.high || 0
  const total = low + moderate + high || 1
  const lowPct = (low / total) * 100
  const modPct = (moderate / total) * 100
  const highPct = (high / total) * 100

  return (
    <div className="card space-y-4 p-6 border-primary/5">
      <h3 className="text-sm font-semibold text-ink/75">{t('admin.riskDist')}</h3>
      <div className="h-6 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
        <div style={{ width: `${lowPct}%` }} className="bg-[#10B981] h-full transition-all duration-500" title={`Low: ${low}`} />
        <div style={{ width: `${modPct}%` }} className="bg-[#F59E0B] h-full transition-all duration-500" title={`Moderate: ${moderate}`} />
        <div style={{ width: `${highPct}%` }} className="bg-[#EF4444] h-full transition-all duration-500" title={`High: ${high}`} />
      </div>
      <div className="flex gap-4 text-xs font-semibold justify-between">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> {t('risk.low')} ({low})</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> {t('risk.moderate')} ({moderate})</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> {t('risk.high')} ({high})</span>
      </div>
    </div>
  )
}
