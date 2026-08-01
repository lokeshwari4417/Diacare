import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import NotificationBell from '../components/shared/NotificationBell'
import LabAnalyticsChart from '../components/shared/LabAnalyticsChart'


export default function DoctorPortalDashboard() {


  const navigate = useNavigate()
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingInvites, setPendingInvites] = useState([])
  const [acceptedPatients, setAcceptedPatients] = useState([])
  const [error, setError] = useState('')

  // Selected Patient Details Drawer
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [patientSummary, setPatientSummary] = useState(null)
  const [patientDashboard, setPatientDashboard] = useState(null)
  const [docSelectedTest, setDocSelectedTest] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [postingNote, setPostingNote] = useState(false)

  const loadDoctorData = async () => {
    setLoading(true)
    try {
      const docRes = await api.doctorMe()
      setDoctorInfo(docRes)

      const linksRes = await api.getDoctorLinks()
      if (linksRes) {
        setPendingInvites(linksRes.pending_invites || [])
        setAcceptedPatients(linksRes.accepted_patients || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load doctor portal data. Please sign in again.')
      localStorage.removeItem('diacare_doctor_token')
      navigate('/doctor-login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDoctorData()
  }, [])

  const handleRespond = async (linkId, accept) => {
    try {
      await api.respondDoctorLink(linkId, accept)
      await loadDoctorData()
    } catch (err) {
      alert('Action failed: ' + err.message)
    }
  }

  const openPatientPortal = async (patientId) => {
    setSelectedPatientId(patientId)
    setLoadingSummary(true)
    try {
      const res = await api.getDoctorPatientSummary(patientId)
      setPatientSummary(res)
    } catch (err) {
      alert('Failed to load patient summary: ' + err.message)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handlePostNote = async (e) => {
    e.preventDefault()
    if (!noteText.trim() || !selectedPatientId) return
    setPostingNote(true)
    try {
      await api.addDoctorNote(selectedPatientId, noteText.trim())
      setNoteText('')
      // Reload summary to display new note
      const res = await api.getDoctorPatientSummary(selectedPatientId)
      setPatientSummary(res)
    } catch (err) {
      alert('Failed to post note: ' + err.message)
    } finally {
      setPostingNote(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('diacare_doctor_token')
    localStorage.removeItem('diacare_doctor_info')
    navigate('/doctor-login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-muted text-sm font-medium">
        Loading Physician Portal...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-ink py-8 px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="glass-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg">
              🩺
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-ink">{doctorInfo?.name}</h1>
              <p className="text-xs text-muted">
                License: <span className="font-mono font-medium text-ink">{doctorInfo?.license_number || 'N/A'}</span> | Email: {doctorInfo?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell isDoctor={true} />
            <button
              onClick={handleLogout}
              className="btn-secondary text-xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
            >
              Sign Out
            </button>
          </div>
        </div>


        {error && (
          <div className="p-3 bg-risk-highBg border border-risk-high/20 rounded-2xl text-xs text-risk-high">
            {error}
          </div>
        )}

        {/* 1. Pending Patient Invitations */}
        {pendingInvites.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <h2 className="text-sm font-bold text-amber-900">Pending Patient Link Requests ({pendingInvites.length})</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingInvites.map((inv) => (
                <div key={inv.link_id} className="bg-white p-3.5 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ink">{inv.patient_name}</span>
                    <p className="text-[11px] text-muted">{inv.patient_email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRespond(inv.link_id, true)}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(inv.link_id, false)}
                      className="btn-secondary text-xs py-1 px-2.5 text-muted hover:text-rose-600"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Accepted Linked Patients Grid */}
        <div className="glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-ink">Linked Patients Directory</h2>
            <span className="text-xs text-muted">{acceptedPatients.length} active patient links</span>
          </div>

          {acceptedPatients.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted">
              No linked patients yet. Patients can invite you using your registered email (<b>{doctorInfo?.email}</b>).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {acceptedPatients.map((pat) => (
                <div
                  key={pat.link_id}
                  onClick={() => openPatientPortal(pat.patient_id)}
                  className="p-4 bg-slate-50 border border-slate-200/70 hover:border-primary/40 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-ink">{pat.patient_name}</span>
                    <span className="pill text-[9px] uppercase font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Linked
                    </span>
                  </div>
                  <p className="text-xs text-muted font-mono">{pat.patient_email}</p>
                  <div className="pt-2 text-right">
                    <span className="text-xs font-semibold text-primary hover:underline">View Medical Portal →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patient Medical Portal Drawer Modal */}
        <AnimatePresence>
          {selectedPatientId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-slate-200"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xl font-display font-bold text-ink">
                      {patientSummary ? patientSummary.patient_name : 'Patient Medical Portal'}
                    </h3>
                    <p className="text-xs text-muted">Physician Read-Only Clinical Access</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatientId(null)
                      setPatientSummary(null)
                    }}
                    className="w-8 h-8 rounded-full bg-slate-100 text-ink/70 hover:bg-slate-200 font-bold text-sm flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {loadingSummary ? (
                  <div className="py-12 text-center text-xs text-muted">Fetching patient medical record...</div>
                ) : patientSummary ? (
                  <div className="space-y-6">
                    {/* Latest Test Summary */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm text-ink">Latest Lab Panel Results</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {patientSummary.summary.map((item) => (
                          <div key={item.test_name_normalized} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-ink">{item.test_name_normalized}</span>
                              <span className="pill text-[9px] uppercase font-bold border bg-slate-100 text-slate-700">
                                {item.latest_status}
                              </span>
                            </div>
                            <p className="text-lg font-bold font-mono text-ink">{item.latest_value} <span className="text-xs font-normal text-muted">{item.unit}</span></p>
                            <p className="text-[10px] text-muted">Ref: {item.ref_low} - {item.ref_high} {item.unit}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risk Flags */}
                    {patientSummary.risk_flag_history && patientSummary.risk_flag_history.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-ink">Historical Risk Pattern Flags</h4>
                        <div className="space-y-2">
                          {patientSummary.risk_flag_history.map((rf) => (
                            <div key={rf.risk_flag_id} className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="font-bold text-xs text-rose-900">{rf.condition_name}</span>
                                <p className="text-[11px] text-rose-700 font-medium">{rf.rationale_text}</p>
                              </div>
                              <span className="pill text-[9px] uppercase font-bold bg-risk-highBg text-risk-high border border-risk-high/20">
                                {rf.likelihood_enum}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive Longitudinal Trends Chart */}
                    {patientDashboard && docSelectedTest && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-ink">Longitudinal Trends & Risk History</h4>
                          <select
                            value={docSelectedTest}
                            onChange={(e) => setDocSelectedTest(e.target.value)}
                            className="input-field text-xs bg-slate-50 py-1 font-semibold"
                          >
                            {Object.keys(patientDashboard.trend_series || {}).map((tname) => (
                              <option key={tname} value={tname}>
                                {tname}
                              </option>
                            ))}
                          </select>
                        </div>
                        <LabAnalyticsChart
                          testName={docSelectedTest}
                          trendPoints={patientDashboard.trend_series[docSelectedTest] || []}
                          riskFlags={patientDashboard.risk_flag_history || []}
                        />
                      </div>
                    )}

                    {/* Doctor Clinical Notes Section */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">

                      <h4 className="font-bold text-sm text-ink">Doctor Clinical Notes & Observations</h4>
                      
                      <form onSubmit={handlePostNote} className="space-y-2">
                        <textarea
                          rows={2}
                          required
                          className="input-field text-xs bg-white"
                          placeholder="Add clinical observation or advice for this patient..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                        />
                        <div className="text-right">
                          <button
                            type="submit"
                            disabled={postingNote}
                            className="btn-primary text-xs py-1.5 px-4"
                          >
                            {postingNote ? 'Posting Note...' : 'Add Note'}
                          </button>
                        </div>
                      </form>

                      {/* Display existing notes */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        {patientSummary.doctor_notes && patientSummary.doctor_notes.length > 0 ? (
                          patientSummary.doctor_notes.map((note) => (
                            <div key={note.id} className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-primary">{note.doctor_name}</span>
                                <span className="text-[10px] text-muted">{new Date(note.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-ink/90 font-medium leading-relaxed">{note.note_text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted text-center py-2">No clinical notes recorded yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
