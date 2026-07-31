import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function AboutModelPage() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">{t('about.title')}</h1>
        <p className="text-muted text-sm mt-1">{t('about.subtitle')}</p>
      </div>

      <div className="card space-y-3">
        <h3 className="text-lg font-semibold text-ink">{t('about.dataset')}</h3>
        <p className="text-sm text-muted leading-relaxed font-medium">
          {t('about.datasetText')}
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="text-lg font-semibold text-ink">{t('about.status')}</h3>
        <p className="text-sm text-muted leading-relaxed font-medium">
          {t('about.statusText')}
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="text-lg font-semibold text-ink">{t('about.limitations')}</h3>
        <ul className="text-sm text-muted leading-relaxed font-medium list-disc list-inside space-y-2">
          <li>{t('about.lim1')}</li>
          <li>{t('about.lim2')}</li>
          <li>{t('about.lim3')}</li>
          <li>{t('about.lim4')}</li>
        </ul>
      </div>

      <div className="card space-y-3">
        <h3 className="text-lg font-semibold text-ink">{t('about.intended')}</h3>
        <p className="text-sm text-muted leading-relaxed font-medium">
          {t('about.intendedText')}
        </p>
      </div>
    </motion.div>
  )
}
