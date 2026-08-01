import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import LabAnalyticsChart from '../components/shared/LabAnalyticsChart'

export default function LabTrendsDashboardPage() {
  const { user } = useAuth()
  const patientId = user?.id

  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedTest, setSelectedTest] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientId) return
    async function loadDashboard() {
      setLoading(true)
      try {
        const res = await api.getPatientDashboard(patientId)
        if (res) {
          setDashboardData(res)
          const focusTests = res.recommended_focus_tests || []
          if (focusTests.length > 0) {
            setSelectedTest(focusTests[0])
          } else if (res.summary && res.summary.length > 0) {
            setSelectedTest(res.summary[0].test_name_normalized)
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load trends dashboard.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [patientId])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-xs font-medium text-muted">
        Loading Trends & Visual Analytics...
      </div>
    )
  }

  const allTests = dashboardData?.summary ? dashboardData.summary.map((s) => s.test_name_normalized) : []
  const currentTrendPoints = selectedTest && dashboardData?.trend_series ? dashboardData.trend_series[selectedTest] || [] : []

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Longitudinal Lab Trends & Analytics</h1>
          <p className="text-xs text-muted mt-0.5">
            Visual trajectory charts with shaded reference bounds & clinical risk pattern timeline.
          </p>
        </div>

        {/* Test Selector Dropdown */}
        {allTests.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-ink">Select Test Panel:</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="input-field text-xs bg-white py-1.5 font-semibold"
            >
              {allTests.map((tname) => (
                <option key={tname} value={tname}>
                  {tname} {dashboardData?.recommended_focus_tests?.includes(tname) ? '⚠️' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-risk-highBg border border-risk-high/20 rounded-2xl text-xs text-risk-high">
          {error}
        </div>
      )}

      {/* Main Chart Component */}
      {selectedTest ? (
        <LabAnalyticsChart
          testName={selectedTest}
          trendPoints={currentTrendPoints}
          riskFlags={dashboardData?.risk_flag_history || []}
        />
      ) : (
        <div className="glass-card text-center py-10 text-xs text-muted">
          No lab tests available for trend charting yet. Submit a lab report to start tracking your health trends over time.
        </div>
      )}
    </motion.div>
  )
}
