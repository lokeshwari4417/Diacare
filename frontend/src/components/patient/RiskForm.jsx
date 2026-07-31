import { useTranslation } from 'react-i18next'
import { CLINICAL_FIELDS } from './fields'

/**
 * Manual entry form / editable confirmation step for the 8 clinical
 * fields (Section 3.1 & 4). Used for both fresh manual entry and for
 * reviewing scan-extracted values before submission -- scans are never
 * trusted blindly.
 */
export default function RiskForm({ values, onChange, onSubmit, submitting, submitLabel, confidence }) {
  const { t } = useTranslation()
  const update = (key, val) => onChange({ ...values, [key]: val })

  const labelText = submitLabel || t('screening.submitLabel')

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {confidence !== undefined && (
        <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-ink/80 flex items-center gap-2 border border-primary/10">
          <span className="pill bg-primary/10 text-primary">{t('screening.scanConfidence', { pct: Math.round(confidence * 100) })}</span>
          <span>{t('screening.scanWarning')}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CLINICAL_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label-text flex items-center gap-1.5 text-ink/80 font-semibold" htmlFor={f.key}>
              {t(`clinical.${f.key}`)} {f.unit && <span className="text-muted font-normal text-xs">({f.unit})</span>}
              <Tooltip text={t(`clinical.${f.key}.hint`)} />
            </label>
            <input
              id={f.key}
              type="number"
              required
              min={f.min}
              max={f.max}
              step={f.step}
              className="input-field transition-all border-primary/10 focus:border-primary focus:ring-primary/20"
              value={values[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
            />
            <p className="text-[11px] text-muted mt-1">{t('screening.typical', { min: f.min, max: f.max })}</p>
          </div>
        ))}
      </div>
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
        {submitting ? t('screening.calculating') : labelText}
      </button>
    </form>
  )
}

function Tooltip({ text }) {
  return (
    <span className="relative group inline-flex">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/70 cursor-help hover:text-primary">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-52 text-[11px] leading-snug bg-ink text-white rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 shadow-soft">
        {text}
      </span>
    </span>
  )
}
