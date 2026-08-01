import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../api'

export default function ShareDoctorModal({ reportId, patientId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [shareInfo, setShareInfo] = useState(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function initShare() {
      setLoading(true)
      try {
        let res
        if (reportId) {
          res = await api.shareReport(reportId)
        } else if (patientId) {
          res = await api.shareSummary(patientId)
        }
        if (res) setShareInfo(res)
      } catch (err) {
        setError(err.message || 'Failed to generate doctor share link.')
      } finally {
        setLoading(false)
      }
    }
    initShare()
  }, [reportId, patientId])

  const fullShareUrl = shareInfo ? `${window.location.origin}${shareInfo.share_url}` : ''

  const copyToClipboard = () => {
    if (!fullShareUrl) return
    navigator.clipboard.writeText(fullShareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleRevoke = async () => {
    if (!shareInfo?.share_token) return
    setRevoking(true)
    try {
      await api.revokeShare(shareInfo.share_token)
      setShareInfo(null)
      setError('Share link has been successfully revoked.')
    } catch (err) {
      setError(err.message || 'Failed to revoke link.')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-display font-bold text-ink">Share Medical Report with Doctor</h3>
            <p className="text-xs text-muted">Generates a secure read-only URL valid for 7 days.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-ink/70 hover:bg-slate-200 font-bold text-sm flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted">Generating secure share link...</div>
        ) : error ? (
          <div className="space-y-3 py-2">
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>
            <button onClick={onClose} className="btn-secondary text-xs w-full justify-center">Close</button>
          </div>
        ) : shareInfo ? (
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted">Shareable Doctor Link</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={fullShareUrl}
                  className="input-field text-xs font-mono border-primary/20 bg-slate-50 flex-1 select-all"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="btn-primary text-xs shrink-0 py-2 px-3.5"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1 text-muted">
              <p><span className="font-semibold text-ink">Expires:</span> {new Date(shareInfo.expires_at).toLocaleString()}</p>
              <p>Anyone with this link can view the read-only medical report without logging in.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                {revoking ? 'Revoking...' : 'Revoke Share Link'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary text-xs">Done</button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}
