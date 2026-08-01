import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'

const MANDATORY_DISCLAIMER = (
  "This AI system is designed to assist in interpreting laboratory reports and providing educational insights. " +
  "It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions."
)

export default function PublicSharedReportPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [sharedData, setSharedData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSharedContent() {
      setLoading(true)
      try {
        const data = await api.getPublicSharedContent(token)
        setSharedData(data)
      } catch (err) {
        setError(err.message || 'Shared link is invalid, expired, or revoked.')
      } finally {
        setLoading(false)
      }
    }
    loadSharedContent()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-muted text-sm font-medium">
        Loading shared medical report...
      </div>
    )
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-3xl p-6 max-w-md w-full text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-lg font-display font-bold text-ink">Link Unavailable</h1>
          <p className="text-xs text-muted leading-relaxed">
            {error || 'This shared medical link is no longer accessible.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-ink py-8 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
        {/* Shared Read-Only Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h1 className="font-display font-bold text-base text-white">DiaCare — Shared Read-Only Medical View</h1>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Shared Patient: <span className="font-semibold text-white">{sharedData.patient_name}</span> | Link expires: {new Date(sharedData.expires_at).toLocaleString()}
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700">
            Public View
          </span>
        </div>

        {/* Top Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
            !
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {MANDATORY_DISCLAIMER}
          </p>
        </div>

        {/* Render Single Report */}
        {sharedData.type === 'single_report' && sharedData.report && (
          <div className="space-y-6">
            <div className="glass-card">
              <h2 className="text-xl font-display font-bold text-ink">Lab Analysis Report</h2>
              <p className="text-xs text-muted mt-1">
                Facility: <span className="font-semibold text-ink">{sharedData.report.lab_name}</span> | Date: {sharedData.report.report_date}
              </p>
            </div>

            {/* Risk Flags */}
            {sharedData.report.risk_flags && sharedData.report.risk_flags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-md font-bold text-ink">Identified Health Patterns & Risk Flags</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedData.report.risk_flags.map((flag) => (
                    <div key={flag.id} className="glass-card border-l-4 border-l-risk-high p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-ink">{flag.condition_name}</h4>
                        <span className="pill text-[10px] font-bold uppercase bg-risk-highBg text-risk-high border border-risk-high/20">
                          {flag.likelihood_enum} Likelihood
                        </span>
                      </div>
                      <p className="text-xs text-muted font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-semibold text-ink">Rationale:</span> {flag.rationale_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Results Table */}
            <div className="glass-card space-y-4">
              <h3 className="text-md font-bold text-ink">Laboratory Test Panel Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted border-b border-primary/5">
                      <th className="py-2 pr-3 font-semibold">Category</th>
                      <th className="py-2 pr-3 font-semibold">Test Name</th>
                      <th className="py-2 pr-3 font-semibold">Measured Value</th>
                      <th className="py-2 pr-3 font-semibold">Reference Range</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedData.report.test_results.map((tr) => (
                      <tr key={tr.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="py-2.5 pr-3 text-muted font-medium">{tr.category}</td>
                        <td className="py-2.5 pr-3 font-semibold text-ink">{tr.test_name_normalized}</td>
                        <td className="py-2.5 pr-3 font-bold text-ink">
                          {tr.value_numeric} <span className="text-muted font-normal text-[11px]">{tr.unit}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-muted">
                          {tr.ref_low !== null && tr.ref_high !== null ? `${tr.ref_low} - ${tr.ref_high} ${tr.unit}` : 'Standard'}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`pill text-[10px] uppercase font-bold border ${
                            tr.status_enum === 'high' ? 'bg-risk-highBg text-risk-high border-risk-high/20' :
                            tr.status_enum === 'low' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            tr.status_enum === 'borderline' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-risk-lowBg text-risk-low border-risk-low/20'
                          }`}>
                            {tr.status_enum}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explanations */}
            <div className="glass-card space-y-4">
              <h3 className="text-md font-bold text-ink">Plain Language Explanations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sharedData.report.test_results.map((tr) => (
                  <div key={tr.id} className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">{tr.test_name_normalized}</span>
                      <span className="text-xs font-mono font-semibold text-primary">{tr.value_numeric} {tr.unit}</span>
                    </div>
                    <p className="text-xs text-ink/80 leading-relaxed">
                      {tr.interpretation?.plain_language_explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Render Full Summary */}
        {sharedData.type === 'full_summary' && sharedData.summary && (
          <div className="space-y-6">
            <div className="glass-card space-y-4">
              <h3 className="text-lg font-display font-bold text-ink">Patient Cumulative Lab Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sharedData.summary.map((item) => (
                  <div key={item.test_name_normalized} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">{item.test_name_normalized}</span>
                      <span className="pill text-[9px] uppercase font-bold border bg-slate-100 text-slate-700">
                        {item.latest_status}
                      </span>
                    </div>
                    <p className="text-lg font-bold font-mono text-ink">{item.latest_value} <span className="text-xs font-normal text-muted">{item.unit}</span></p>
                    <p className="text-[10px] text-muted">Latest date: {item.latest_date}</p>
                  </div>
                ))}
              </div>
            </div>

            {sharedData.risk_flag_history && sharedData.risk_flag_history.length > 0 && (
              <div className="glass-card space-y-3">
                <h3 className="text-lg font-display font-bold text-ink">Historical Risk Flags Timeline</h3>
                <div className="space-y-2">
                  {sharedData.risk_flag_history.map((rf) => (
                    <div key={rf.risk_flag_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-ink">{rf.condition_name}</span>
                        <p className="text-[11px] text-muted">{rf.rationale_text}</p>
                      </div>
                      <div className="text-right">
                        <span className="pill text-[9px] uppercase font-bold border bg-amber-50 text-amber-700 border-amber-200">
                          {rf.likelihood_enum}
                        </span>
                        <p className="text-[10px] text-muted mt-0.5">{rf.report_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
            !
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {MANDATORY_DISCLAIMER}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
