import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import AuthShell from './AuthShell'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(`/${user.role}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-display font-bold text-center mb-1 text-ink">{t('auth.welcomeBack')}</h1>
      <p className="text-center text-sm text-muted mb-6">{t('auth.loginSubtitle')}</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label-text">{t('auth.email')}</label>
          <input
            type="email" required className="input-field border-primary/10"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label-text">{t('auth.password')}</label>
            <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline mb-1">{t('auth.forgotPassword')}</Link>
          </div>
          <input
            type="password" required className="input-field border-primary/10"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
          {loading ? t('profile.saving') : t('auth.loginCta')}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-primary font-semibold hover:underline">{t('nav.register')}</Link>
      </p>

      <div className="mt-6 pt-5 border-t border-primary/5">
        <p className="text-[11px] text-center text-muted mb-2 font-medium">Demo accounts (after running seed_admin.py)</p>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted text-center font-mono">
          <span>patient@diacare.demo</span><span>patient123</span>
          <span>doctor@diacare.demo</span><span>doctor123</span>
          <span>ngo@diacare.demo</span><span>ngo12345</span>
          <span>admin@diacare.demo</span><span>admin123</span>
        </div>
      </div>
    </AuthShell>
  )
}
