import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function CreatePatientPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const base = user.role === 'ngo' ? '/ngo' : '/doctor'
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', mobile: '', information: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const patient = await api.createPatient(form)
      navigate(`${base}/patient/${patient.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-lg mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">{t('patients.createProfile')}</h1>
        <p className="text-muted text-sm mt-1">
          {user.role === 'ngo' ? t('patients.ngoSubtitle') : t('patients.doctorSubtitle')}
        </p>
      </div>
      <form onSubmit={submit} className="glass-card space-y-4">
        <div>
          <label className="label-text">{t('auth.name')}</label>
          <input required className="input-field border-primary/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label-text">{t('auth.email')}</label>
          <input type="email" required className="input-field border-primary/10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label-text">{t('auth.mobile')}</label>
          <input className="input-field border-primary/10" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
        </div>
        <div>
          <label className="label-text">{t('patient.infoLabel')}</label>
          <textarea className="input-field border-primary/10 min-h-[90px]" value={form.information} onChange={(e) => setForm({ ...form, information: e.target.value })} />
        </div>
        {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}
        <button className="btn-primary w-full justify-center flex" disabled={saving}>{saving ? t('profile.saving') : t('patients.createProfile')}</button>
      </form>
    </motion.div>
  )
}
