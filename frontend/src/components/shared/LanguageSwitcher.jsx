import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'es', label: 'Español' },
  { code: 'hi', label: 'हिन्दी' },
]


export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const change = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('diacare_lang', code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm text-ink/70 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
      >
        <GlobeIcon />
        <span className="hidden sm:inline">{LANGUAGES.find((l) => l.code === i18n.language)?.label || 'English'}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-soft border border-black/5 py-1 z-20">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => change(l.code)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-light rounded-lg text-ink/80"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9z" />
    </svg>
  )
}
