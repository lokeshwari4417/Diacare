import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'

export default function DoctorLoginPage() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let res
      if (isRegister) {
        res = await api.doctorRegister({
          name,
          email,
          password,
          license_number: licenseNumber || null,
        })
      } else {
        res = await api.doctorLogin({ email, password })
      }

      if (res && res.access_token) {
        localStorage.setItem('diacare_doctor_token', res.access_token)
        localStorage.setItem('diacare_doctor_info', JSON.stringify(res.doctor))
        navigate('/doctor-portal')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-md w-full p-8 space-y-6 shadow-2xl border border-slate-200"
      >
        <div className="text-center space-y-1">
          <div className="inline-block p-3 rounded-2xl bg-primary-light text-primary font-bold text-xl mb-1">
            🩺
          </div>
          <h1 className="text-2xl font-display font-bold text-ink">DiaCare Doctor Portal</h1>
          <p className="text-xs text-muted">
            {isRegister ? 'Create a physician portal account' : 'Sign in to access your linked patient medical reports'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-risk-highBg border border-risk-high/20 rounded-2xl text-xs text-risk-high text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="label-text">Full Name & Title</label>
              <input
                type="text"
                required
                className="input-field border-primary/10 text-sm"
                placeholder="Dr. Sarah Jenkins, MD"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label-text">Professional Email</label>
            <input
              type="email"
              required
              className="input-field border-primary/10 text-sm"
              placeholder="doctor@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label-text">Password</label>
            <input
              type="password"
              required
              className="input-field border-primary/10 text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label className="label-text">Medical License Number (Optional)</label>
              <input
                type="text"
                className="input-field border-primary/10 text-sm"
                placeholder="e.g. MD-849204"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center text-sm py-3 mt-2"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Doctor Account' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 text-xs text-muted flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
            className="text-primary font-bold hover:underline"
          >
            {isRegister ? 'Already have a doctor account? Sign In' : 'New physician? Create Doctor Account'}
          </button>
          <Link to="/login" className="text-slate-400 hover:text-ink">
            Patient App →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
