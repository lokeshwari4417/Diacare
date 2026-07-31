import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import AuthShell from './AuthShell'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [demoToken, setDemoToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.forgotPassword(email)
      setMessage(res.detail)
      if (res.demo_reset_token) setDemoToken(res.demo_reset_token)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.resetPassword({ email, reset_token: resetToken, new_password: newPassword })
      setMessage(t('profile.pwSuccess'))
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-display font-bold text-center mb-1 text-ink">{t('auth.forgotTitle')}</h1>
      <p className="text-center text-sm text-muted mb-6">{t('auth.forgotSubtitle')}</p>

      {step === 1 && (
        <form onSubmit={requestReset} className="space-y-4">
          <div>
            <label className="label-text">{t('auth.email')}</label>
            <input type="email" required className="input-field border-primary/10" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}
          <button className="btn-primary w-full justify-center flex" disabled={loading}>
            {loading ? t('profile.saving') : t('auth.sendReset')}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitReset} className="space-y-4">
          <p className="text-sm text-primary bg-primary-light rounded-xl px-3 py-2">{message}</p>
          {demoToken && (
            <p className="text-[11px] text-muted bg-slate-50 rounded-xl px-3 py-2 border border-primary/5">
              Demo mode (no email service configured): your reset token is <code className="font-mono">{demoToken}</code>
            </p>
          )}
          <div>
            <label className="label-text">{t('admin.resetPwBtn')}</label>
            <input required className="input-field border-primary/10" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
          </div>
          <div>
            <label className="label-text">{t('profile.newPassword')}</label>
            <input type="password" required minLength={6} className="input-field border-primary/10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}
          <button className="btn-primary w-full justify-center flex" disabled={loading}>
            {loading ? t('profile.pwUpdating') : t('profile.changePassword')}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="text-center space-y-4">
          <p className="text-sm text-primary bg-primary-light rounded-xl px-3 py-3 font-semibold">{message}</p>
          <Link to="/login" className="btn-primary inline-block">{t('auth.backToLogin')}</Link>
        </div>
      )}

      <p className="text-center text-sm text-muted mt-6">
        <Link to="/login" className="text-primary font-semibold hover:underline">{t('auth.backToLogin')}</Link>
      </p>
    </AuthShell>
  )
}
