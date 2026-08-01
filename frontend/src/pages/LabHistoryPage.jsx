import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import ShareDoctorModal from '../components/shared/ShareDoctorModal'

export default function LabHistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [summaryList, setSummaryList] = useState([])
  const [riskFlagsList, setRiskFlagsList] = useState([])
  const [pastReports, setPastReports] = useState([])
  const [error, setError] = useState('')

  const [downloadingSummaryPdf, setDownloadingSummaryPdf] = useState(false)
  const [showShareSummaryModal, setShowShareSummaryModal] = useState(false)

  // Doctor Linking State
  const [doctorLinks, setDoctorLinks] = useState([])
  const [doctorNotes, setDoctorNotes] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  // Trend Chart Modal State
  const [selectedTest, setSelectedTest] = useState(null)
  const [trendPoints, setTrendPoints] = useState([])
  const [loadingTrend, setLoadingTrend] = useState(false)

  const patientId = user?.id

  const loadHistoryData = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const [sumRes, flagRes, repRes, linksRes, notesRes, auditRes] = await Promise.all([
        api.getPatientLabSummary(patientId),
        api.getRiskFlagHistory(patientId),
        api.getPatientLabReports(patientId, 0, 20),
        api.getPatientDoctorLinks(patientId).catch(() => null),
        api.getPatientDoctorNotes(patientId).catch(() => null),
        api.getPatientAuditLogs(patientId).catch(() => null),
      ])

      if (sumRes && sumRes.summary) setSummaryList(sumRes.summary)
      if (flagRes && flagRes.risk_flags) setRiskFlagsList(flagRes.risk_flags)
      if (repRes && repRes.items) setPastReports(repRes.items)
      if (linksRes && linksRes.doctor_links) setDoctorLinks(linksRes.doctor_links)
      if (notesRes && notesRes.notes) setDoctorNotes(notesRes.notes)
      if (auditRes && auditRes.audit_logs) setAuditLogs(auditRes.audit_logs)
    } catch (err) {
      setError(err.message || 'Failed to load lab history data.')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadHistoryData()
  }, [patientId])

  const handleInviteDoctor = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !patientId) return
    setInviting(true)
    try {
      await api.inviteDoctor(patientId, inviteEmail.trim())
      setInviteEmail('')
      await loadHistoryData()
    } catch (err) {
      alert('Invite failed: ' + err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeDoctorLink = async (linkId) => {
    if (!patientId) return
    try {
      await api.revokeDoctorLink(patientId, linkId)
      await loadHistoryData()
    } catch (err) {
      alert('Revoke failed: ' + err.message)
    }
  }


  const openTrendChart = async (testName) => {
    setSelectedTest(testName)
    setLoadingTrend(true)
    try {
      const res = await api.getTestTrend(patientId, testName)
      if (res && res.points) setTrendPoints(res.points)
    } catch (err) {
      console.error("Failed to load test trend points:", err)
    } finally {
      setLoadingTrend(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-muted">
        Loading Lab Report History & Trends...
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8">
      {/* Page Title & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-card">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Lab Report History & Trends</h1>
          <p className="text-xs text-muted mt-1">
            Aggregated longitudinal trends and historical risk pattern analysis across all your lab tests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSummaryPdf}
            disabled={downloadingSummaryPdf}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {downloadingSummaryPdf ? 'Downloading PDF...' : '📄 Download Summary PDF'}
          </button>
          <button
            type="button"
            onClick={() => setShowShareSummaryModal(true)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            🔗 Share Summary
          </button>
          <Link to="/lab/new" className="btn-primary text-xs flex items-center gap-1">
            + New Lab Analysis
          </Link>
        </div>
      </div>

      {/* Share Doctor Modal for Patient Summary */}
      {showShareSummaryModal && (
        <ShareDoctorModal
          patientId={patientId}
          onClose={() => setShowShareSummaryModal(false)}
        />
      )}


      {error && (
        <div className="p-3 bg-risk-highBg border border-risk-high/20 rounded-2xl text-xs text-risk-high">
          {error}
        </div>
      )}

      {/* 1. Summary Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-ink">Lab Test Summaries</h2>
          <span className="text-xs text-muted">Click any test card to view longitudinal trend chart</span>
        </div>

        {summaryList.length === 0 ? (
          <div className="glass-card text-center py-8 text-muted text-xs">
            No lab report records found. Click "+ New Lab Analysis" above to upload or enter your first report!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {summaryList.map((item) => (
              <div
                key={item.test_name_normalized}
                onClick={() => openTrendChart(item.test_name_normalized)}
                className="glass-card hover:border-primary/40 cursor-pointer transition-all duration-200 p-4 space-y-2 hover:shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink truncate max-w-[140px]">{item.test_name_normalized}</span>
                  <span className={`pill text-[9px] uppercase font-bold border ${
                    item.latest_status === 'high' ? 'bg-risk-highBg text-risk-high border-risk-high/20' :
                    item.latest_status === 'low' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    item.latest_status === 'borderline' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-risk-lowBg text-risk-low border-risk-low/20'
                  }`}>
                    {item.latest_status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xl font-bold font-mono text-ink">{item.latest_value}</span>
                    <span className="text-[11px] text-muted ml-1">{item.unit}</span>
                  </div>

                  {/* Direction Badge */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    {item.direction === 'improving' && (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                        ↑ Improving
                      </span>
                    )}
                    {item.direction === 'worsening' && (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-0.5">
                        ↓ Escalating
                      </span>
                    )}
                    {item.direction === 'stable' && (
                      <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        → Stable
                      </span>
                    )}
                    {item.direction === 'insufficient_data' && (
                      <span className="text-slate-400 text-[10px]">1 record</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-muted flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Ref: {item.ref_low} - {item.ref_high} {item.unit}</span>
                  <span>Date: {item.latest_date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Risk Flag Timeline */}
      <div className="glass-card space-y-4">
        <h2 className="text-lg font-display font-bold text-ink">Historical Risk Flag Timeline</h2>
        
        {riskFlagsList.length === 0 ? (
          <p className="text-xs text-muted">No high or moderate risk condition patterns recorded in your lab history.</p>
        ) : (
          <div className="relative border-l-2 border-primary/20 ml-3 pl-4 space-y-4 py-1">
            {riskFlagsList.map((rf) => (
              <div key={rf.risk_flag_id} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                  rf.likelihood_enum === 'high' ? 'border-risk-high bg-risk-high' : 'border-amber-500 bg-amber-500'
                }`} />

                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-xs text-ink">{rf.condition_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted font-medium">{rf.report_date}</span>
                      <span className={`pill text-[10px] uppercase font-bold border ${
                        rf.likelihood_enum === 'high' ? 'bg-risk-highBg text-risk-high border-risk-high/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {rf.likelihood_enum} Likelihood
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-ink/80 leading-relaxed font-medium">
                    <span className="text-muted">Rationale:</span> {rf.rationale_text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Paginated Past Reports List */}
      <div className="glass-card space-y-4">
        <h2 className="text-lg font-display font-bold text-ink">Past Lab Reports Archive</h2>
        
        {pastReports.length === 0 ? (
          <p className="text-xs text-muted">No reports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-primary/5">
                  <th className="py-2.5 pr-3 font-semibold">Report Date</th>
                  <th className="py-2.5 pr-3 font-semibold">Facility / Lab Name</th>
                  <th className="py-2.5 pr-3 font-semibold">Total Tests</th>
                  <th className="py-2.5 pr-3 font-semibold">Abnormal Count</th>
                  <th className="py-2.5 pr-3 font-semibold">Status</th>
                  <th className="py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pastReports.map((rep) => (
                  <tr
                    key={rep.id}
                    onClick={() => navigate(`/lab/report/${rep.id}`)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3 font-semibold text-ink">{rep.report_date}</td>
                    <td className="py-3 pr-3 font-medium text-ink/80">{rep.lab_name}</td>
                    <td className="py-3 pr-3 font-mono font-medium">{rep.total_tests} tests</td>
                    <td className="py-3 pr-3">
                      {rep.abnormal_count > 0 ? (
                        <span className="text-risk-high font-bold bg-risk-highBg px-2 py-0.5 rounded-full border border-risk-high/20">
                          {rep.abnormal_count} abnormal
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          All normal
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="capitalize text-muted font-medium">{rep.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-primary font-semibold hover:underline">View Report →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Phase 6: Invite Your Doctor (Account Linking) */}
      <div className="glass-card space-y-4">
        <div>
          <h2 className="text-lg font-display font-bold text-ink">Invite Your Doctor (Account Linking)</h2>
          <p className="text-xs text-muted">
            Connect directly with your physician’s DiaCare portal account for continuous read-only medical monitoring.
          </p>
        </div>

        <form onSubmit={handleInviteDoctor} className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            required
            placeholder="Enter doctor's email (e.g. doctor@hospital.org)"
            className="input-field text-xs bg-white flex-1 min-w-[240px]"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={inviting}
            className="btn-primary text-xs py-2 px-4"
          >
            {inviting ? 'Sending Invite...' : '✉️ Send Doctor Invite'}
          </button>
        </form>

        {doctorLinks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Your Doctor Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctorLinks.map((dl) => (
                <div key={dl.link_id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ink">{dl.doctor_name}</span>
                    <p className="text-[11px] font-mono text-muted">{dl.doctor_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`pill text-[9px] uppercase font-bold border ${
                      dl.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {dl.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevokeDoctorLink(dl.link_id)}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Phase 6: Doctor Clinical Notes & Observations */}
      {doctorNotes.length > 0 && (
        <div className="glass-card space-y-3 bg-primary-light/10 border-primary/20">
          <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
            <span>🩺</span> Doctor Clinical Notes & Observations
          </h2>
          <div className="space-y-2">
            {doctorNotes.map((note) => (
              <div key={note.id} className="bg-white p-4 rounded-2xl border border-primary/10 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-primary">{note.doctor_name}</span>
                  <span className="text-[10px] text-muted">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-ink/90 font-medium leading-relaxed">{note.note_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Phase 9: Security & Data Access Audit Trail */}
      <div className="glass-card space-y-3">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <span>🛡️</span> Security & Data Access Audit Trail
            </h2>
            <p className="text-xs text-muted">HIPAA-style access log tracking who viewed or exported your medical data.</p>
          </div>
          <span className="pill text-[9px] uppercase font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {auditLogs.length} Events Logged
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-muted">No security access events recorded yet.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl">
                <div>
                  <span className="font-semibold text-ink uppercase tracking-wider text-[11px] font-mono">
                    [{log.actor_type}] {log.action}
                  </span>
                  {log.target_type && (
                    <p className="text-[10px] text-muted font-mono">
                      Target: {log.target_type} ({log.target_id?.slice(0, 8)})
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted font-mono whitespace-nowrap">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Trend Line Chart Modal */}
      <AnimatePresence>
        {selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-display font-bold text-ink">{selectedTest} Trend Analysis</h3>
                  <p className="text-xs text-muted">Longitudinal values plotted over time with healthy reference band.</p>
                </div>
                <button
                  onClick={() => setSelectedTest(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-ink/70 hover:bg-slate-200 font-bold text-sm flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {loadingTrend ? (
                <div className="py-12 text-center text-xs text-muted">Loading trend data points...</div>
              ) : trendPoints.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted">No trend data points found for {selectedTest}.</div>
              ) : (
                <div className="space-y-4">
                  {trendPoints.length === 1 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
                      Single measurement recorded on {trendPoints[0].report_date} ({trendPoints[0].value_numeric} {trendPoints[0].unit}). Add more lab reports over time to generate a trajectory line!
                    </div>
                  ) : null}

                  {/* SVG Chart */}
                  <TrendSvgChart points={trendPoints} />

                  {/* Data Table */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 max-h-48 overflow-y-auto text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-muted font-semibold border-b border-slate-200 pb-1">
                          <th className="pb-1">Date</th>
                          <th className="pb-1">Measured Value</th>
                          <th className="pb-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trendPoints.map((pt, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 font-medium">{pt.report_date}</td>
                            <td className="py-1.5 font-mono font-bold">{pt.value_numeric} {pt.unit}</td>
                            <td className="py-1.5">
                              <span className="capitalize font-semibold text-muted">{pt.status_enum}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Clean SVG Line Chart Component with Shaded Reference Range
function TrendSvgChart({ points }) {
  if (!points || points.length === 0) return null

  const width = 500
  const height = 220
  const padding = 40

  const values = points.map((p) => p.value_numeric).filter((v) => v !== null)
  const refL = points[0]?.ref_low ?? Math.min(...values)
  const refH = points[0]?.ref_high ?? Math.max(...values)

  const minV = Math.min(...values, refL) * 0.9
  const maxV = Math.max(...values, refH) * 1.1

  const mapY = (val) => height - padding - ((val - minV) / (maxV - minV || 1)) * (height - 2 * padding)
  const mapX = (idx) => padding + (idx / (points.length - 1 || 1)) * (width - 2 * padding)

  const pathD = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(idx)} ${mapY(pt.value_numeric)}`)
    .join(' ')

  const refY1 = mapY(refH)
  const refY2 = mapY(refL)

  return (
    <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto font-sans">
        {/* Shaded Reference Range Box */}
        {refL !== null && refH !== null && (
          <g>
            <rect
              x={padding}
              y={refY1}
              width={width - 2 * padding}
              height={Math.max(2, refY2 - refY1)}
              fill="#10b981"
              fillOpacity="0.12"
              rx="4"
            />
            <line x1={padding} y1={refY1} x2={width - padding} y2={refY1} stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
            <line x1={padding} y1={refY2} x2={width - padding} y2={refY2} stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
            <text x={width - padding + 5} y={refY1 + 4} fill="#059669" fontSize="9" fontWeight="bold">Ref Upper ({refH})</text>
            <text x={width - padding + 5} y={refY2 + 4} fill="#059669" fontSize="9" fontWeight="bold">Ref Lower ({refL})</text>
          </g>
        )}

        {/* Path Line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Plotted Data Points */}
        {points.map((pt, idx) => {
          const cx = mapX(idx)
          const cy = mapY(pt.value_numeric)
          return (
            <g key={idx} className="group cursor-pointer">
              <circle cx={cx} cy={cy} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">
                {pt.value_numeric}
              </text>
              <text x={cx} y={height - 12} textAnchor="middle" fontSize="9" fill="#64748b">
                {pt.report_date}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
