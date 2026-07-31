import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { emptyClinicalInput } from '../components/patient/fields'
import RiskForm from '../components/patient/RiskForm'
import ScanUpload from '../components/patient/ScanUpload'
import DisclaimerBanner from '../components/shared/DisclaimerBanner'
import VoiceAssistant from '../components/shared/VoiceAssistant'

/**
 * Doctor/NGO performing the manual-entry or scan-upload flow on a
 * patient's behalf (Section 3.2 / 3.3) -- the same components the
 * patient uses, reused here.
 */
export default function ClinicianScreeningPage() {
  const { t } = useTranslation()
  const { patientId } = useParams()
  const { user } = useAuth()
  const base = user.role === 'ngo' ? '/ngo' : '/doctor'
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [method, setMethod] = useState('manual')
  const [values, setValues] = useState(emptyClinicalInput())
  const [confidence, setConfidence] = useState(undefined)
  const [scanned, setScanned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.getPatient(patientId).then(setPatient) }, [patientId])

  const onExtracted = (res) => {
    setValues(res.extracted)
    setConfidence(res.confidence)
    setScanned(true)
  }

  const submit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const report = await api.createReport({
        patient_id: patientId,
        source: scanned ? 'scan' : 'manual',
        pregnancies: Number(values.pregnancies),
        glucose: Number(values.glucose),
        blood_pressure: Number(values.blood_pressure),
        skin_thickness: Number(values.skin_thickness),
        insulin: Number(values.insulin),
        bmi: Number(values.bmi),
        diabetes_pedigree_function: Number(values.diabetes_pedigree_function),
        age: Number(values.age),
      })
      navigate(`${base}/report/${report.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoiceCommand = (command) => {
    const normalized = command.toLowerCase().trim()
    
    if (normalized === 'submit' || normalized === 'submit form' || normalized === 'get my risk estimate') {
      submit()
      return
    }
    
    if (normalized === 'clear' || normalized === 'clear form' || normalized === 'reset') {
      setValues(emptyClinicalInput())
      setScanned(false)
      setConfidence(undefined)
      return
    }

    const match = normalized.match(/(?:set\s+)?(pregnancies|glucose|blood\s*pressure|skin\s*thickness|insulin|bmi|pedigree|age)\s+(?:to\s+)?(\d+(?:\.\d+)?)/)
    if (match) {
      let field = match[1].replace(/\s+/g, '_')
      if (field === 'pedigree') field = 'diabetes_pedigree_function'
      const val = match[2]
      setValues((v) => ({ ...v, [field]: val }))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">{t('screening.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('screening.subtitle')} ({patient?.name || 'Patient'})</p>
        </div>
        <div className="bg-white/80 p-1.5 rounded-xl border border-primary/5 shadow-soft">
          <VoiceAssistant onCommand={handleVoiceCommand} />
        </div>
      </div>

      <DisclaimerBanner />

      <div className="glass-card">
        <div className="flex gap-2 mb-6 bg-primary-light/50 rounded-xl p-1 w-fit">
          <button onClick={() => setMethod('manual')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${method === 'manual' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-ink'}`}>{t('screening.manualTab')}</button>
          <button onClick={() => setMethod('scan')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${method === 'scan' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-ink'}`}>{t('screening.scanTab')}</button>
        </div>

        {method === 'scan' && !scanned && <ScanUpload onExtracted={onExtracted} />}

        {(method === 'manual' || scanned) && (
          <div className={method === 'scan' ? 'mt-6' : ''}>
            {scanned && <p className="text-sm font-semibold text-ink mb-4">{t('screening.confirmExtracted')}</p>}
            <RiskForm values={values} onChange={setValues} onSubmit={submit} submitting={submitting} confidence={scanned ? confidence : undefined} />
          </div>
        )}

        {error && <p className="text-sm text-risk-high mt-4 bg-risk-highBg border border-risk-high/15 rounded-xl px-3 py-2">{error}</p>}
      </div>
    </motion.div>
  )
}
