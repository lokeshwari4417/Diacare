import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { api } from '../api'

const MANDATORY_DISCLAIMER = (
  "This AI system is designed to assist in interpreting laboratory reports and providing educational insights. " +
  "It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions."
)

export default function NewLabReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { reportId } = useParams()

  const [referenceTests, setReferenceTests] = useState([])
  const [labName, setLabName] = useState('Diagnostic Laboratory')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState([
    { test_name: 'Fasting Glucose', value: '', unit: 'mg/dL' },
    { test_name: 'HbA1c', value: '', unit: '%' }
  ])

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)

  // Fetch reference tests for typeahead / autocomplete
  useEffect(() => {
    async function loadReference() {
      try {
        const res = await api.getLabReference()
        if (res && res.tests) setReferenceTests(res.tests)
      } catch (err) {
        console.error("Failed to load lab reference data:", err)
      }
    }
    loadReference()
  }, [])

  // Load existing report if reportId is in URL
  useEffect(() => {
    if (!reportId) return
    async function fetchReport() {
      setLoading(true)
      try {
        const data = await api.getLabReport(reportId)
        setReportData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [reportId])

  const handleTestSelect = (index, selectedName) => {
    const matched = referenceTests.find(
      (t) => t.canonical_name.toLowerCase() === selectedName.toLowerCase() || t.key === selectedName
    )
    const newRows = [...rows]
    newRows[index].test_name = selectedName
    if (matched) {
      newRows[index].unit = matched.unit
    }
    setRows(newRows)
  }

  const handleRowChange = (index, field, val) => {
    const newRows = [...rows]
    newRows[index][field] = val
    setRows(newRows)
  }

  const addRow = () => {
    setRows([...rows, { test_name: '', value: '', unit: 'mg/dL' }])
  }

  const removeRow = (index) => {
    if (rows.length === 1) return
    setRows(rows.filter((_, i) => i !== index))
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setError('')

    const validResults = rows
      .filter((r) => r.test_name.trim() !== '' && r.value !== '')
      .map((r) => ({
        test_name: r.test_name.trim(),
        value: parseFloat(r.value),
        unit: r.unit || 'mg/dL',
      }))

    if (validResults.length === 0) {
      setError('Please enter at least one valid lab test name and numeric value.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.createLabReport({
        lab_name: labName,
        report_date: reportDate,
        results: validResults,
      })
      navigate(`/lab/report/${res.report_id}`)
    } catch (err) {
      setError(err.message || 'Failed to submit lab report.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-muted">
        Loading Lab Analysis...
      </div>
    )
  }

  // Render Analysis Results View if reportData exists
  if (reportData) {
    // Group test results by category
    const categoryMap = {}
    reportData.test_results.forEach((tr) => {
      if (!categoryMap[tr.category]) categoryMap[tr.category] = []
      categoryMap[tr.category].push(tr)
    })

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
        {/* Top Mandatory Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
            !
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {MANDATORY_DISCLAIMER}
          </p>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 glass-card">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">Lab Analysis Report</h1>
            <p className="text-xs text-muted mt-1">
              Facility: <span className="font-semibold text-ink">{reportData.lab_name}</span> | Date: {reportData.report_date}
            </p>
          </div>
          <Link to="/lab/new" className="btn-primary text-xs flex items-center gap-1">
            + New Lab Report
          </Link>
        </div>

        {/* 1. Risk Flags Section */}
        {reportData.risk_flags && reportData.risk_flags.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-risk-high"></span>
              Identified Health Patterns & Risk Flags
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.risk_flags.map((flag) => (
                <div key={flag.id} className="glass-card border-l-4 border-l-risk-high p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-ink">{flag.condition_name}</h3>
                    <span className={`pill text-[11px] uppercase tracking-wider font-bold ${
                      flag.likelihood_enum === 'high' ? 'bg-risk-highBg text-risk-high border-risk-high/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                    } border`}>
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

        {/* 2. Grouped Lab Test Results Table */}
        <div className="glass-card space-y-4">
          <h2 className="text-lg font-display font-bold text-ink">Laboratory Test Panel Results</h2>
          
          {Object.entries(categoryMap).map(([category, tests]) => (
            <div key={category} className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider bg-primary-light/50 px-3 py-1.5 rounded-lg inline-block">
                {category}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted border-b border-primary/5">
                      <th className="py-2 pr-3 font-semibold">Test Name</th>
                      <th className="py-2 pr-3 font-semibold">Measured Value</th>
                      <th className="py-2 pr-3 font-semibold">Reference Range</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((tr) => (
                      <tr key={tr.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="py-2.5 pr-3 font-semibold text-ink">{tr.test_name_normalized}</td>
                        <td className="py-2.5 pr-3 font-bold text-ink">
                          {tr.value_numeric} <span className="text-muted font-normal text-[11px]">{tr.unit}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-muted font-medium">
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
          ))}
        </div>

        {/* 3. Plain Language Interpretations Cards */}
        <div className="glass-card space-y-4">
          <h2 className="text-lg font-display font-bold text-ink">Plain Language Explanations & Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportData.test_results.map((tr) => (
              <div key={tr.id} className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-ink">{tr.test_name_normalized}</span>
                  <span className="text-xs font-mono font-semibold text-primary">{tr.value_numeric} {tr.unit}</span>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed">
                  {tr.interpretation?.plain_language_explanation}
                </p>
                {tr.interpretation?.possible_causes && tr.interpretation.possible_causes.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted">Potential Contributing Factors:</p>
                    <ul className="list-disc list-inside text-[11px] text-muted space-y-0.5 mt-0.5">
                      {tr.interpretation.possible_causes.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Actionable Recommendations Section */}
        {reportData.recommendations && reportData.recommendations.length > 0 && (
          <div className="glass-card space-y-3">
            <h2 className="text-lg font-display font-bold text-ink">General Lifestyle & Follow-Up Recommendations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportData.recommendations.map((rec) => (
                <div key={rec.id} className="p-3 bg-primary-light/30 border border-primary/10 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-white px-2 py-0.5 rounded-md border border-primary/10 inline-block">
                    {rec.category}
                  </span>
                  <p className="text-xs text-ink/90 font-medium leading-relaxed mt-1">
                    {rec.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Mandatory Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
            !
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {MANDATORY_DISCLAIMER}
          </p>
        </div>
      </motion.div>
    )
  }

  // Render Manual Entry Form
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div className="glass-card">
        <h1 className="text-2xl font-display font-bold text-ink">New Lab Report Analysis</h1>
        <p className="text-sm text-muted mt-1">
          Enter laboratory test values manually to receive instant reference range interpretations and Tier-1 rule-based risk evaluation.
        </p>

        <form onSubmit={submitForm} className="space-y-6 mt-6">
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Laboratory Facility Name</label>
              <input
                type="text"
                className="input-field border-primary/10"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                placeholder="e.g. Quest Diagnostics / Metropolis Lab"
              />
            </div>
            <div>
              <label className="label-text">Report Date</label>
              <input
                type="date"
                className="input-field border-primary/10"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>

          {/* Test Entries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Test Results Panel</h2>
              <span className="text-xs text-muted">Select from 20 common tests or type test name</span>
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                {/* Searchable / Typeahead Select */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-bold text-muted uppercase">Test Name</label>
                  <input
                    list="lab-tests-list"
                    type="text"
                    required
                    className="input-field text-sm border-primary/10 bg-white"
                    placeholder="e.g. Fasting Glucose"
                    value={row.test_name}
                    onChange={(e) => handleTestSelect(idx, e.target.value)}
                  />
                </div>

                {/* Numeric Value */}
                <div className="w-28">
                  <label className="text-[10px] font-bold text-muted uppercase">Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="input-field text-sm border-primary/10 bg-white font-mono font-bold"
                    placeholder="0.0"
                    value={row.value}
                    onChange={(e) => handleRowChange(idx, 'value', e.target.value)}
                  />
                </div>

                {/* Unit */}
                <div className="w-24">
                  <label className="text-[10px] font-bold text-muted uppercase">Unit</label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm border-primary/10 bg-white text-muted"
                    value={row.unit}
                    onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                  />
                </div>

                {/* Delete Row */}
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-xs font-bold text-risk-high hover:underline pt-4 px-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {/* Datalist for autocomplete */}
            <datalist id="lab-tests-list">
              {referenceTests.map((t) => (
                <option key={t.key} value={t.canonical_name}>
                  {t.category} ({t.unit})
                </option>
              ))}
            </datalist>

            <button
              type="button"
              onClick={addRow}
              className="btn-secondary text-xs w-full py-2.5 border-dashed border-primary/30 flex items-center justify-center gap-1.5"
            >
              + Add Another Test Result
            </button>
          </div>

          {error && (
            <p className="text-xs text-risk-high bg-risk-highBg border border-risk-high/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center flex text-sm py-3"
          >
            {submitting ? 'Analyzing Lab Report...' : 'Analyze Lab Report'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
