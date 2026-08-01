import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'Hindi (हिंदी)' },
  { code: 'Tamil', label: 'Tamil (தமிழ்)' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'Bengali', label: 'Bengali (বাংলা)' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
]

const QUICK_PROMPTS = [
  "What foods should I eat or avoid?",
  "What exercise is recommended for my risk level?",
  "How can I lower my diabetes risk?",
]

export default function Chatbot() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('English')

  const [messages, setMessages] = useState([])
  useEffect(() => {
    setMessages([
      { role: 'bot', text: t('chat.welcome') || "Hello! I am your DiaCare Lifestyle Guide. Ask me anything about diet, exercise, or your screening results!" }
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

  const send = async (e, customText) => {
    if (e) e.preventDefault()
    const text = (customText || input).trim()
    if (!text || sending) return
    setMessages((m) => [...m, { role: 'user', text }])
    if (!customText) setInput('')
    setSending(true)
    try {
      const res = await api.chat({
        message: text,
        mode: user?.role === 'doctor' || user?.role === 'ngo' ? 'clinician' : 'patient',
        context_report_id: contextReportId,
        language: selectedLang,
      })
      setMessages((m) => [...m, { role: 'bot', text: res.reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: t('chat.error') || "Sorry, I couldn't process your question right now. Please try again." }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Chat" : "Open DiaCare AI Assistant"}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-soft flex items-center justify-center hover:bg-primary-dark transition-colors"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </motion.button>

      {/* Floating Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40, originX: 0.9, originY: 0.9 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-5 z-40 w-[92vw] max-w-sm h-[30rem] bg-white rounded-2xl shadow-soft border border-primary/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-white px-4 py-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-sm">DiaCare AI Lifestyle Guide</p>
                <p className="text-[10px] text-white/80 font-medium">Powered by Gemini 2.0 Flash</p>
              </div>

              {/* Language Selector Dropdown */}
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg px-2 py-1 border border-white/20 outline-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="text-ink">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Messages Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
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

              {/* Quick Prompt Chips */}
              {!sending && messages.length <= 3 && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted">Suggested Questions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => send(e, prompt)}
                        className="text-[11px] bg-white border border-primary/15 text-primary hover:bg-primary-light font-medium px-2.5 py-1.5 rounded-xl transition-all text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-primary/5 bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about diet, exercise, or risk..."
                className="input-field flex-1 text-sm border-primary/10"
              />
              <button
                type="submit"
                className="btn-primary p-2.5 flex items-center justify-center shrink-0"
                disabled={sending || !input.trim()}
              >
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
