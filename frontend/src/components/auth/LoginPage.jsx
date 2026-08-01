import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api'
import AuthShell from './AuthShell'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login, verifyOtpLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [step, setStep] = useState('login')
  const [otpCode, setOtpCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [demoOtp, setDemoOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (step === 'login') {
        const res = await login(form.email, form.password)
        if (res && res.requires_otp) {
          setStep('otp')
          if (res.demo_otp) {
            setDemoOtp(res.demo_otp)
          }
          setCooldown(60)
        } else if (res && res.role) {
          navigate(`/${res.role}`)
        }
      } else {
        const user = await verifyOtpLogin(form.email, otpCode)
        navigate(`/${user.role}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError('')
    try {
      const res = await api.resendOtp({ email: form.email })
      setCooldown(60)
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthShell>
      {step === 'login' ? (
        <>
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
              <span className="col-span-2 pt-1 font-semibold text-primary">Admin Account:</span>
              <span>lokeshwaritharunkumar@gmail.com</span><span>sandhiya@12345</span>
            </div>
          </div>

        </>
      ) : (
        <>
          <h1 className="text-xl font-display font-bold text-center mb-1 text-ink">Enter Verification Code</h1>
          <p className="text-center text-sm text-muted mb-6">A 6-digit OTP code has been sent to your email.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label-text">6-Digit Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                className="input-field border-primary/10 tracking-[0.4em] font-mono text-center text-lg font-bold py-3"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            {demoOtp && (
              <div className="bg-primary-light/50 border border-primary/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">Demo Mode OTP</p>
                <p className="text-lg font-bold font-mono text-primary select-all mt-0.5">{demoOtp}</p>
              </div>
            )}

            {error && <p className="text-sm text-risk-high bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
          </form>

          <div className="flex flex-col items-center justify-center gap-2 mt-6">
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className={`text-sm font-semibold ${cooldown > 0 ? 'text-muted cursor-not-allowed' : 'text-primary hover:underline'}`}
            >
              {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Verification Code'}
            </button>
            <button
              onClick={() => {
                setStep('login')
                setOtpCode('')
                setError('')
              }}
              className="text-xs text-muted hover:text-ink font-medium mt-1"
            >
              ← Back to Login
            </button>
          </div>
        </>
      )}
    </AuthShell>
  )
}

