import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { api } from '../api'
import ShareDoctorModal from '../components/shared/ShareDoctorModal'
import MobileCameraCapture from '../components/lab/MobileCameraCapture'


const MANDATORY_DISCLAIMER = (
  "This AI system is designed to assist in interpreting laboratory reports and providing educational insights. " +
  "It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions."
)

export default function NewLabReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { reportId } = useParams()

  const [mode, setMode] = useState('manual') // 'manual' | 'upload'
  const [referenceTests, setReferenceTests] = useState([])
  const [labName, setLabName] = useState('Diagnostic Laboratory')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFile, setSelectedFile] = useState(null)

  const [rows, setRows] = useState([
    { test_name: 'Fasting Glucose', value: '', unit: 'mg/dL', is_matched: true },
    { test_name: 'HbA1c', value: '', unit: '%', is_matched: true }
  ])

  const [loading, setLoading] = useState(false)
  const [ocrScanning, setOcrScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [draftReportId, setDraftReportId] = useState(null)

  const handleDownloadPdf = async () => {
    if (!reportData?.id) return
    setDownloadingPdf(true)
    try {
      await api.downloadSingleReportPdf(reportData.id)
    } catch (err) {
      alert('Failed to download PDF: ' + err.message)
    } finally {
      setDownloadingPdf(false)
    }
  }


  // Fetch reference tests & patient lab profile
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [refRes, profRes] = await Promise.all([
          api.getLabReference(),
          api.getPatientLabProfile('me').catch(() => null),
        ])
        if (refRes && refRes.tests) setReferenceTests(refRes.tests)
        if (profRes && (profRes.age_years || profRes.sex)) {
          setProfile({
            age_years: profRes.age_years || '',
            sex: profRes.sex || 'male',
            is_pregnant: !!profRes.is_pregnant,
          })
          setProfileSaved(true)
        }
      } catch (err) {
        console.error("Failed to load initial lab reference/profile:", err)
      }
    }
    loadInitialData()
  }, [])


  // Load existing report if reportId is in URL
  useEffect(() => {
    if (!reportId) return
    async function fetchReport() {
      setLoading(true)
      try {
        const data = await api.getLabReport(reportId)
        if (data.status === 'completed') {
          setReportData(data)
        } else if (data.status === 'pending_review') {
          setDraftReportId(data.id)
        }
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
      newRows[index].is_matched = true
    }
    setRows(newRows)
  }

  const handleRowChange = (index, field, val) => {
    const newRows = [...rows]
    newRows[index][field] = val
    setRows(newRows)
  }

  const addRow = () => {
    setRows([...rows, { test_name: '', value: '', unit: 'mg/dL', is_matched: true }])
  }

  const removeRow = (index) => {
    if (rows.length === 1) return
    setRows(rows.filter((_, i) => i !== index))
  }

  // Phase 2 OCR Upload Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select an image or PDF lab report file.')
      return
    }
    setError('')
    setOcrScanning(true)
    try {
      const draft = await api.uploadLabReport(selectedFile, labName)
      setDraftReportId(draft.report_id)
      
      if (draft.extracted_rows && draft.extracted_rows.length > 0) {
        const mappedRows = draft.extracted_rows.map((item) => ({
          test_name: item.test_name_matched || item.test_name_raw,
          value: item.value !== null ? item.value : '',
          unit: item.unit || 'mg/dL',
          is_matched: item.is_matched,
        }))
        setRows(mappedRows)
      } else {
        setError('OCR complete: No lab values automatically detected. Please enter values manually.')
      }
    } catch (err) {
      setError(err.message || 'Failed to scan report file.')
    } finally {
      setOcrScanning(false)
    }
  }

  // Phase 11 Mobile Camera Capture Handler
  const handleCameraCaptureComplete = async (capturedFile, pageCount) => {
    setError('')
    setOcrScanning(true)
    try {
      const draft = await api.uploadLabReport(capturedFile, labName)
      setDraftReportId(draft.report_id)
      setMode('upload') // Switch to review view
      
      if (draft.extracted_rows && draft.extracted_rows.length > 0) {
        const mappedRows = draft.extracted_rows.map((item) => ({
          test_name: item.test_name_matched || item.test_name_raw,
          value: item.value !== null && item.value !== undefined ? item.value : '',
          unit: item.unit || 'mg/dL',
          is_matched: item.is_matched,
          needs_review: item.needs_review,
          review_reason: item.review_reason,
        }))
        setRows(mappedRows)
      } else {
        setError('Camera scan complete: No lab values automatically detected. Please verify or enter values manually.')
      }
    } catch (err) {
      setError(err.message || 'Failed to process camera scan image.')
    } finally {
      setOcrScanning(false)
    }
  }


  // Confirm Draft OR Submit Manual Entry
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
      if (draftReportId) {
        // Phase 2 Confirm
        const res = await api.confirmLabReport(draftReportId, {
          lab_name: labName,
          report_date: reportDate,
          results: validResults,
        })
        navigate(`/lab/report/${res.report_id}`)
      } else {
        // Phase 1 Manual Create
        const res = await api.createLabReport({
          lab_name: labName,
          report_date: reportDate,
          results: validResults,
        })
        navigate(`/lab/report/${res.report_id}`)
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze lab report.')
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
              {reportData.source_type && (
                <span className="ml-2 uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                  Source: {reportData.source_type}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              {downloadingPdf ? 'Downloading PDF...' : '📄 Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              🔗 Share with Doctor
            </button>
          </div>
        </div>

        {/* Share Doctor Modal */}
        {showShareModal && (
          <ShareDoctorModal
            reportId={reportData.id}
            onClose={() => setShowShareModal(false)}
          />
        )}


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

  // Render Entry Form (Manual vs Upload OCR Draft Review)
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div className="glass-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">New Lab Report Analysis</h1>
            <p className="text-sm text-muted mt-0.5">Phase 1 & Phase 2: Manual entry or Image/PDF OCR upload with human review.</p>
          </div>

          {/* Mode Switcher Tabs */}
          {!draftReportId && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'manual' ? 'bg-white text-primary shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'upload' ? 'bg-white text-primary shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Upload Report (Image/PDF)
              </button>
              <button
                type="button"
                onClick={() => setMode('camera')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'camera' ? 'bg-white text-primary shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                📷 Scan Report (Camera)
              </button>
            </div>
          )}

        </div>

        {/* Optional Demographic Profile Banner */}
        {!profileSaved && !profileDismissed && (
          <div className="bg-primary-light/30 border border-primary/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Demographic Range Precision (Optional)</h2>
                <p className="text-xs text-muted mt-0.5">Set age & sex to tune clinical reference bounds (e.g., Hemoglobin, Creatinine, eGFR).</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileDismissed(true)}
                className="text-xs font-bold text-muted hover:text-ink"
              >
                Skip for now
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-24">
                <label className="text-[10px] font-bold uppercase text-muted">Age (Years)</label>
                <input
                  type="number"
                  placeholder="e.g. 35"
                  className="input-field text-xs bg-white py-1.5"
                  value={profile.age_years}
                  onChange={(e) => setProfile({ ...profile, age_years: e.target.value })}
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] font-bold uppercase text-muted">Sex</label>
                <select
                  className="input-field text-xs bg-white py-1.5"
                  value={profile.sex}
                  onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {profile.sex === 'female' && (
                <label className="flex items-center gap-1.5 text-xs text-ink mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.is_pregnant}
                    onChange={(e) => setProfile({ ...profile, is_pregnant: e.target.checked })}
                  />
                  Pregnant
                </label>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.updatePatientLabProfile('me', {
                      age_years: profile.age_years ? parseInt(profile.age_years) : null,
                      sex: profile.sex,
                      is_pregnant: profile.is_pregnant,
                    })
                    setProfileSaved(true)
                  } catch (e) {
                    console.error(e)
                  }
                }}
                className="btn-primary text-xs py-1.5 px-3 mt-4"
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

        {/* Upload Form Box if mode === 'upload' and no draft loaded yet */}
        {mode === 'upload' && !draftReportId && (
          <form onSubmit={handleUploadSubmit} className="mb-6 bg-primary-light/20 border border-primary/15 rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-bold text-primary">Upload Lab Document (Image or PDF)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-text">Select Document File (.jpg, .png, .pdf)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, application/pdf"
                  required
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                />
              </div>
              <div>
                <label className="label-text">Facility Name</label>
                <input
                  type="text"
                  className="input-field border-primary/10 bg-white text-sm"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={ocrScanning}
              className="btn-primary w-full justify-center flex text-xs py-2.5"
            >
              {ocrScanning ? 'Scanning Document via Gemini Vision...' : 'Extract Lab Data with AI'}
            </button>
          </form>
        )}

        {/* Phase 11: Camera Capture Box if mode === 'camera' and no draft loaded yet */}
        {mode === 'camera' && !draftReportId && (
          <div className="mb-6">
            <MobileCameraCapture
              onCaptureComplete={handleCameraCaptureComplete}
              onCancel={() => setMode('upload')}
            />
          </div>
        )}

        {/* Human Review Banner if Draft Loaded */}

        {draftReportId && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-900">Review AI-Extracted Lab Data</p>
              <p className="text-[11px] text-blue-700 font-medium">Please review, correct, or add test rows below before confirming analysis.</p>
            </div>
            <span className="pill text-[10px] font-bold bg-blue-100 text-blue-800 uppercase border border-blue-300">
              Pending Review
            </span>
          </div>
        )}

        {/* Main Test Results Entry & Review Form */}
        <form onSubmit={submitForm} className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Test Results Panel</h2>
              <span className="text-xs text-muted">Review canonical test names and numeric values</span>
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                {/* Searchable / Typeahead Select */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted uppercase">Test Name</label>
                    {row.needs_review && (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                        ⚠️ Needs Review {row.review_reason ? `(${row.review_reason})` : ''}
                      </span>
                    )}
                    {row.is_matched === false && !row.needs_review && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        Unmatched - Verify
                      </span>
                    )}
                  </div>

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
            {submitting
              ? 'Analyzing Lab Report...'
              : draftReportId
              ? 'Confirm & Analyze Report'
              : 'Analyze Lab Report'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
