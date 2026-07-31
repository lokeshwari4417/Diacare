import { useTranslation } from 'react-i18next'

export default function DisclaimerBanner({ compact = false }) {
  const { t } = useTranslation()
  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-xl border border-risk-moderate/30 bg-risk-moderateBg text-ink/80 ${
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
      }`}
    >
      <svg className="shrink-0 mt-0.5" width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="#D98E2C" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <p>
        <strong>{t('disclaimer.title')}:</strong> {t('disclaimer.text')}
      </p>
    </div>
  )
}
