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
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '', role: 'patient' })
  const [error, setError] = useState('')
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
      const user = await register(payload)
      navigate(`/${user.role}`)
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

      <form onSubmit={submit} className="space-y-4">
        <RoleSelector value={form.role} onChange={(role) => setForm({ ...form, role })} />

        <div>
          <label className="label-text">{t('auth.name')}</label>
          <input required className="input-field border-primary/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
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

      <p className="text-center text-sm text-muted mt-6">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">{t('nav.login')}</Link>
      </p>
    </AuthShell>
  )
}
