import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import ResultCard from '../components/patient/ResultCard'
import ExplainabilityPanel from '../components/patient/ExplainabilityPanel'
import ReferenceComparison from '../components/patient/ReferenceComparison'
import WhatIfSimulator from '../components/patient/WhatIfSimulator'
import DisclaimerBanner from '../components/shared/DisclaimerBanner'
import VoiceAssistant from '../components/shared/VoiceAssistant'
import RiskForm from '../components/patient/RiskForm'

const STATUSES = ['draft', 'submitted_by_ngo', 'reviewed_by_doctor', 'finalized']

function StatusTimeline({ currentStatus }) {
  const { t } = useTranslation()
  const currentIndex = STATUSES.indexOf(currentStatus)
  
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-ink/70 mb-4">{t('status.timeline')}</h3>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2">
        {STATUSES.map((status, index) => {
          const active = index <= currentIndex
          const isCurrent = index === currentIndex
          
          return (
            <div key={status} className="flex-1 w-full flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  isCurrent ? 'bg-primary border-primary text-white shadow-soft ring-4 ring-primary/20' : active ? 'bg-primary-light border-primary/20 text-primary' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${isCurrent ? 'text-ink' : active ? 'text-primary' : 'text-slate-400'}`}>
                  {t(`status.${status}`)}
                </span>
              </div>
              {index < STATUSES.length - 1 && (
                <div className={`hidden sm:block flex-1 h-0.5 mx-2 rounded ${
                  index < currentIndex ? 'bg-primary/40' : 'bg-slate-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResultPage() {
  const { t } = useTranslation()
  const { reportId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState(null)

  const canReview = user.role === 'doctor' || user.role === 'ngo'
  const canFinalize = user.role === 'doctor'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.getReport(reportId)
      setReport(r)
      const inputs = {
        pregnancies: r.pregnancies, glucose: r.glucose, blood_pressure: r.blood_pressure,
        skin_thickness: r.skin_thickness, insulin: r.insulin, bmi: r.bmi,
        diabetes_pedigree_function: r.diabetes_pedigree_function, age: r.age,
      }
      const p = await api.predict(inputs)
      setPrediction(p)
      setEditValues(inputs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => { load() }, [load])

  const downloadPdf = async () => {
    try {
      const blob = await api.downloadReportPdf(reportId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diacare_report_${reportId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(t('chat.error'))
    }
  }

  const setStatus = async (status) => {
    setStatusSaving(true)
    try {
      const updated = await api.updateReportStatus(reportId, status)
      setReport(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setStatusSaving(false)
    }
  }

  const saveEdit = async (e) => {
    if (e) e.preventDefault()
    setSubmitting(true)
    try {
      const updated = await api.updateReportValues(reportId, {
        pregnancies: Number(editValues.pregnancies),
        glucose: Number(editValues.glucose),
        blood_pressure: Number(editValues.blood_pressure),
        skin_thickness: Number(editValues.skin_thickness),
        insulin: Number(editValues.insulin),
        bmi: Number(editValues.bmi),
        diabetes_pedigree_function: Number(editValues.diabetes_pedigree_function),
        age: Number(editValues.age),
      })
      setReport(updated)
      setIsEditing(false)
      // reload prediction
      const p = await api.predict(editValues)
      setPrediction(p)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const [submitting, setSubmitting] = useState(false)

  const handleVoiceCommand = (command) => {
    const normalized = command.toLowerCase().trim()
    if (normalized.includes('download') || normalized.includes('pdf') || normalized.includes('report')) {
      downloadPdf()
    } else if (normalized.includes('back') || normalized.includes('history') || normalized.includes('home')) {
      navigate(-1)
    }
  }

  if (loading) return <div className="text-center text-muted py-12">{t('screening.scanning')}</div>
  if (error) return <div className="text-center text-risk-high py-12 bg-risk-highBg max-w-md mx-auto border border-risk-high/10 rounded-2xl">{error}</div>
  if (!report || !prediction) return null

  const inputs = {
    pregnancies: report.pregnancies, glucose: report.glucose, blood_pressure: report.blood_pressure,
    skin_thickness: report.skin_thickness, insulin: report.insulin, bmi: report.bmi,
    diabetes_pedigree_function: report.diabetes_pedigree_function, age: report.age,
  }
  const readAloudText = `Your estimated risk is ${Math.round(prediction.probability * 100)} percent, classified as ${prediction.risk_band} risk. ${prediction.summary} This is not a diagnosis -- please consult a healthcare professional for any concerns.`

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-3xl mx-auto space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">{t('result.title')}</h1>
          <p className="text-sm text-muted mt-1">
            {t('result.submitted')} {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceAssistant textToRead={readAloudText} onCommand={handleVoiceCommand} />
          <button onClick={downloadPdf} className="btn-secondary text-sm flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {t('result.downloadPdf')}
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatusTimeline currentStatus={report.status} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ResultCard probability={prediction.probability} riskBand={prediction.risk_band} summary={prediction.summary} />
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <DisclaimerBanner />
      </motion.div>

      {canReview && (
        <motion.div variants={itemVariants} className="glass-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/70">Report status: <span className="font-semibold text-primary">{t(`status.${report.status}`)}</span></p>
            <div className="flex gap-2">
              {user.role === 'ngo' && report.status !== 'submitted_by_ngo' && report.status !== 'finalized' && (
                <button onClick={() => setStatus('submitted_by_ngo')} disabled={statusSaving} className="btn-secondary text-sm">
                  {t('status.sendToDoctor')}
                </button>
              )}
              {canFinalize && report.status !== 'finalized' && (
                <button onClick={() => setStatus('finalized')} disabled={statusSaving} className="btn-primary text-sm">
                  {t('status.finalize')}
                </button>
              )}
              <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary text-sm">
                {isEditing ? t('admin.modalClose') : t('result.editBtn')}
              </button>
            </div>
          </div>
          
          {isEditing && editValues && (
            <div className="border-t border-primary/10 pt-4">
              <h3 className="text-sm font-semibold text-ink/80 mb-3">{t('result.editingTitle')}</h3>
              <RiskForm
                values={editValues}
                onChange={setEditValues}
                onSubmit={saveEdit}
                submitting={submitting}
                submitLabel={t('result.saveBtn')}
              />
            </div>
          )}
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <ExplainabilityPanel factors={prediction.shap_top_factors} showTechnicalByDefault={canReview} />
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <ReferenceComparison items={prediction.reference_comparison} />
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <WhatIfSimulator baseInputs={inputs} baseProbability={prediction.probability} />
      </motion.div>
    </motion.div>
  )
}
