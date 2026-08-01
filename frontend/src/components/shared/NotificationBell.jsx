import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api'

export default function NotificationBell({ isDoctor = false }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifs = async () => {
    try {
      const res = isDoctor
        ? await api.getDoctorNotifications()
        : await api.getPatientNotifications()
      if (res) {
        setNotifications(res.notifications || [])
        setUnreadCount(res.unread_count || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifs()
    // Poll every 30 seconds for background in-app alert updates
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [isDoctor])

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id)
      await fetchNotifs()
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      if (isDoctor) {
        await api.markAllDoctorNotificationsRead()
      } else {
        await api.markAllPatientNotificationsRead()
      }
      await fetchNotifs()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-ink/70 hover:text-ink hover:bg-slate-100 transition-colors"
        title="In-App Notifications & Critical Alerts"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
          >
            <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-ink">In-App Notifications</span>
                {unreadCount > 0 && (
                  <span className="pill text-[9px] uppercase font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">No notifications yet.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`p-3.5 transition-colors cursor-pointer text-xs space-y-1 ${
                      !n.is_read ? 'bg-amber-50/40 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-ink text-xs leading-relaxed">{n.message}</p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1"></span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted font-mono">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
