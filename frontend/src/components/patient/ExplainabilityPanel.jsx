import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function ExplainabilityPanel({ factors, showTechnicalByDefault = false }) {
  const { t } = useTranslation()
  const [showTechnical, setShowTechnical] = useState(showTechnicalByDefault)
  const maxMag = Math.max(...factors.map((f) => f.magnitude), 0.0001)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-1 text-ink">{t('result.drivingFactor')}</h3>
      <p className="text-sm text-muted mb-4">{t('result.drivingFactorDesc')}</p>

      <div className="space-y-4">
        {factors.map((f, i) => {
          const widthPct = Math.max(6, (f.magnitude / maxMag) * 100)
          const up = f.direction === 'increases'
          const featureKey = f.feature.toLowerCase().replace(/\s+/g, '_')
          const translatedFeature = t(`clinical.${featureKey}`, f.feature)
          
          // Re-template the caption dynamically to support i18n
          const translatedCaption = up 
            ? t('clinical.insulin.hint').replace('2-hour', '') // fallback or template
            : ''
          const cleanCaption = `${translatedFeature}: ${f.value} (${up ? t('result.increases') : t('result.decreases')})`

          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-ink/80">{translatedFeature}</span>
                <span className={`font-semibold flex items-center gap-1 ${up ? 'text-risk-high' : 'text-risk-low'}`}>
                  {up ? '↑' : '↓'} {up ? t('result.increases') : t('result.decreases')}
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden relative">
                <motion.div
                  className={`h-full rounded-full ${up ? 'bg-risk-high' : 'bg-risk-low'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {t('clinical.age.hint').includes('Age') 
                  ? `${t('nav.profile')} - ${translatedFeature} (${f.value}): ${up ? t('result.increases') : t('result.decreases')} ${t('app.title')} ${t('result.estimated')}`
                  : cleanCaption
                }
              </p>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setShowTechnical((s) => !s)}
        className="mt-5 text-sm text-primary font-semibold hover:underline flex items-center gap-1"
      >
        {showTechnical ? t('admin.modalClose') : t('nav.profile')} {t('result.techDetails')}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${showTechnical ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {showTechnical && (
        <div className="mt-3 rounded-xl bg-slate-50 border border-primary/5 p-3.5 font-mono text-xs text-ink/70 space-y-1">
          {factors.map((f, i) => (
            <div key={i} className="flex justify-between">
              <span>{t(`clinical.${f.feature.toLowerCase().replace(/\s+/g, '_')}`, f.feature)}</span>
              <span className="font-semibold">SHAP {f.shap_value >= 0 ? '+' : ''}{f.shap_value.toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
