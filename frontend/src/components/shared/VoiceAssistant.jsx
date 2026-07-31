import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

/**
 * Self-contained voice assistant component (Section 3.1).
 *
 * The speech backend is intentionally isolated behind the two functions
 * below (`speak` / `startListening`) so a smarter voice engine can be
 * swapped in later without touching any consumer of this component.
 * v1 uses the browser's built-in Web Speech API.
 *
 * Props:
 *   textToRead: string -- what "read results aloud" should speak
 *   onCommand: (command: string) => void -- called with a recognized
 *              simple command ("show my last scan", "read my results")
 */
export default function VoiceAssistant({ textToRead, onCommand }) {
  const { t } = useTranslation()
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition || !window.speechSynthesis) {
      setSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      if (transcript.includes('read') || transcript.includes('results') || transcript.includes('aloud')) {
        speak(textToRead)
      } else if (onCommand) {
        onCommand(transcript)
      }
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
  }, [textToRead, onCommand])

  const speak = useCallback((text) => {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.98
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }

  if (!supported) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => speak(textToRead)}
        disabled={!textToRead || speaking}
        title={t('result.voiceRead')}
        aria-label={t('result.voiceRead')}
        className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center hover:bg-primary/10 transition-colors disabled:opacity-40"
      >
        <SpeakerIcon active={speaking} />
      </button>
      <div className="relative">
        {listening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/20"
              initial={{ scale: 1 }}
              animate={{ scale: 2 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/10"
              initial={{ scale: 1 }}
              animate={{ scale: 2.5 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            />
          </>
        )}
        <button
          onClick={toggleListening}
          title={t('result.voiceMic')}
          aria-label={t('result.voiceMic')}
          aria-pressed={listening}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative z-10 ${
            listening ? 'bg-red-500 text-white' : 'bg-primary-light text-primary hover:bg-primary/10'
          }`}
        >
          <MicIcon />
        </button>
      </div>
    </div>
  )
}

function SpeakerIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {active && <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5.5a10 10 0 0 1 0 13" />}
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </svg>
  )
}
