import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'

/**
 * Persistent floating chat bubble (Section 3.1 / 3.2).
 * Scoped to: how to use the site, general diabetes education, and
 * explaining the user's own results. Backed by the /chat endpoint, which
 * is currently a templated responder (AI INTEGRATION POINT #3) --
 * swappable later without any change here.
 */
export default function Chatbot() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  
  // Initialize greeting with t()
  const [messages, setMessages] = useState([])
  useEffect(() => {
    setMessages([
      { role: 'bot', text: t('chat.welcome') }
    ])
  }, [t])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  // Dynamically extract context_report_id if on a report page
  const match = location.pathname.match(/\/report\/([a-zA-Z0-9-]+)/)
  const contextReportId = match ? match[1] : null

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open, sending])

  const send = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const res = await api.chat({
        message: text,
        mode: user?.role === 'doctor' || user?.role === 'ngo' ? 'clinician' : 'patient',
        context_report_id: contextReportId
      })
      setMessages((m) => [...m, { role: 'bot', text: res.reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: t('chat.error') }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t('admin.modalClose') : t('chat.assistant')}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-soft flex items-center justify-center hover:bg-primary-dark transition-colors"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40, originX: 0.9, originY: 0.9 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-5 z-40 w-[92vw] max-w-sm h-[28rem] bg-white rounded-2xl shadow-soft border border-primary/5 flex flex-col overflow-hidden"
          >
            <div className="bg-primary text-white px-4 py-3 shadow-sm">
              <p className="font-display font-bold text-sm">{t('chat.assistant')}</p>
              <p className="text-[10px] text-white/80 font-medium">{t('chat.help')}</p>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm shadow-sm'
                        : 'bg-white border border-primary/5 text-ink/90 rounded-bl-sm shadow-card font-medium'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              )}
            </div>
            
            <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-primary/5 bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="input-field flex-1 text-sm border-primary/10"
              />
              <button type="submit" className="btn-primary p-2.5 flex items-center justify-center shrink-0" disabled={sending || !input.trim()}>
                <SendIcon />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-4 py-3 bg-white border border-primary/5 rounded-2xl rounded-bl-sm shadow-card">
      <motion.span className="w-1.5 h-1.5 rounded-full bg-primary/70" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
      <motion.span className="w-1.5 h-1.5 rounded-full bg-primary/70" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} />
      <motion.span className="w-1.5 h-1.5 rounded-full bg-primary/70" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} />
    </div>
  )
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
