import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const STATUS_COLORS = {
  in_range: 'text-risk-low',
  borderline: 'text-risk-moderate',
  out_of_range: 'text-risk-high',
}

const STATUS_BARS = {
  in_range: 'bg-risk-low',
  borderline: 'bg-risk-moderate',
  out_of_range: 'bg-risk-high',
}

export default function ReferenceComparison({ items }) {
  const { t } = useTranslation()
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-1 text-ink">{t('result.compare')}</h3>
      <p className="text-sm text-muted mb-4">{t('result.compareDesc')}</p>

      <div className="space-y-5">
        {items.map((item, i) => {
          const colorClass = STATUS_COLORS[item.status] || 'text-muted'
          const barClass = STATUS_BARS[item.status] || 'bg-muted'
          
          const span = item.high - item.low || 1
          const pos = Math.min(100, Math.max(0, ((item.value - item.low) / span) * 100))
          
          const featureKey = item.feature.toLowerCase().replace(/\s+/g, '_')
          const translatedFeature = t(`clinical.${featureKey}`, item.feature)
          const translatedStatus = t(`status.${item.status}`, item.status.replace('_', ' '))

          return (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-ink/80">{translatedFeature}</span>
                <span className={`font-semibold ${colorClass}`}>{item.value} {item.unit} &middot; {translatedStatus}</span>
              </div>
              <div className="relative h-3 rounded-full bg-slate-100 border border-primary/5">
                <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-emerald-50/50" />
                <motion.div
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-soft ${barClass}`}
                  initial={{ left: '0%' }}
                  animate={{ left: `calc(${pos}% - 8px)` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: i * 0.05 }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted font-medium">
                <span>{item.low} {item.unit}</span>
                <span>{item.high} {item.unit}</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-muted mt-5 font-medium">{t('result.source')}</p>
    </div>
  )
}
