import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api'

const ROLE_LABELS = { patient: 'Patient', doctor: 'Doctor', ngo: 'NGO / Organization', admin: 'Admin' }

export default function Profile() {
  const { t } = useTranslation()
  const { user, refreshUser, logout } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', mobile: user?.mobile || '', information: user?.information || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')

  if (!user) return null

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api.updateMe(form)
      await refreshUser()
      setMessage(t('profile.updated'))
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwMessage('')
    if (pw.new_password !== pw.confirm) {
      setPwError(t('auth.confirmPassword') + ' mismatch')
      return
    }
    setPwSaving(true)
    try {
      await api.changePassword({ current_password: pw.current_password, new_password: pw.new_password })
      setPwMessage(t('profile.pwSuccess'))
      setPw({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6 border-b border-primary/5 pb-4">
          <div>
            <h2 className="text-xl font-display font-bold text-ink">{t('profile.title')}</h2>
            <p className="text-sm text-muted font-medium">{t(`auth.role.${user.role}`)} &middot; {user.email}</p>
          </div>
          <button onClick={logout} className="btn-secondary text-sm">
            {t('nav.logout')}
          </button>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label-text">{t('auth.name')}</label>
            <input className="input-field border-primary/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-text">{t('auth.mobile')}</label>
            <input className="input-field border-primary/10" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div>
            <label className="label-text">{t('patient.infoLabel')}</label>
            <textarea
              className="input-field border-primary/10 min-h-[90px]"
              placeholder={t('chat.welcome')}
              value={form.information}
              onChange={(e) => setForm({ ...form, information: e.target.value })}
            />
          </div>
          {message && <p className="text-sm text-primary font-semibold">{message}</p>}
          <button className="btn-primary" disabled={saving}>{saving ? t('profile.saving') : t('profile.save')}</button>
        </form>
      </div>

      <div className="card border-primary/5">
        <h3 className="text-lg font-semibold mb-4 text-ink">{t('profile.changePassword')}</h3>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label-text">{t('profile.currentPassword')}</label>
            <input type="password" className="input-field border-primary/10" value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
          </div>
          <div>
            <label className="label-text">{t('profile.newPassword')}</label>
            <input type="password" className="input-field border-primary/10" value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="label-text">{t('profile.confirmPassword')}</label>
            <input type="password" className="input-field border-primary/10" value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={6} />
          </div>
          {pwError && <p className="text-sm text-risk-high bg-risk-highBg px-3 py-2 rounded-xl">{pwError}</p>}
          {pwMessage && <p className="text-sm text-primary font-semibold">{pwMessage}</p>}
          <button className="btn-primary" disabled={pwSaving}>{pwSaving ? t('profile.pwUpdating') : t('profile.changePassword')}</button>
        </form>
      </div>
    </motion.div>
  )
}
