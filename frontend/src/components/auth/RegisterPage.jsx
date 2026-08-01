import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import AuthShell from './AuthShell'
import RoleSelector from './RoleSelector'

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '', role: 'patient', information: '' })
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError(t('auth.confirmPassword') + ' mismatch')
      return
    }
    setLoading(true)
    try {
      const { confirm, ...payload } = form
      const res = await register(payload)
      if (res.status === 'pending') {
        setSuccessMessage(res.detail || 'Your registration was successful and is pending admin approval.')
      } else {
        navigate(`/${res.role}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-display font-bold text-center mb-1 text-ink">{t('auth.registerTitle')}</h1>
      <p className="text-center text-sm text-muted mb-6">{t('auth.registerSubtitle')}</p>

      {successMessage ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 bg-primary-light text-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <p className="text-ink font-bold text-lg">Registration Received</p>
          <p className="text-sm text-muted font-medium bg-slate-50 border border-slate-100 rounded-2xl p-4">{successMessage}</p>
          <Link to="/login" className="btn-primary w-full justify-center flex mt-6">
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <RoleSelector value={form.role} onChange={(role) => setForm({ ...form, role, information: '' })} />

          <div>
            <label className="label-text">{t('auth.name')}</label>
            <input required className="input-field border-primary/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          {(form.role === 'doctor' || form.role === 'ngo') && (
            <div>
              <label className="label-text">
                {form.role === 'doctor' ? 'Medical License Number / Clinic Details' : 'NGO / Organization Registration Info'}
              </label>
              <textarea
                required
                rows={2}
                className="input-field border-primary/10 py-2.5 resize-none font-medium text-sm"
                value={form.information}
                onChange={(e) => setForm({ ...form, information: e.target.value })}
                placeholder={form.role === 'doctor' ? 'e.g. License #12345, City Clinic' : 'e.g. NGO Reg #5678, Hope Welfare'}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-text">{t('auth.email')}</label>
              <input type="email" required className="input-field border-primary/10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label-text">{t('auth.mobile')}</label>
              <input className="input-field border-primary/10" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-text">{t('auth.password')}</label>
              <input type="password" required minLength={6} className="input-field border-primary/10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label-text">{t('auth.confirmPassword')}</label>
              <input type="password" required minLength={6} className="input-field border-primary/10" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
            {loading ? t('profile.saving') : t('auth.registerCta')}
          </button>
        </form>
      )}

      {!successMessage && (
        <p className="text-center text-sm text-muted mt-6">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">{t('nav.login')}</Link>
        </p>
      )}
    </AuthShell>
  )
}

