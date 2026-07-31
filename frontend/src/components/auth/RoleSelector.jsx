import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const ROLES = [
  { value: 'patient', icon: PatientIcon, defaultLabel: 'Patient', defaultHint: 'Screen my own risk' },
  { value: 'doctor', icon: DoctorIcon, defaultLabel: 'Doctor', defaultHint: 'Review patient reports' },
  { value: 'ngo', icon: NgoIcon, defaultLabel: 'NGO / Organization', defaultHint: 'Field screening' },
  { value: 'admin', icon: AdminIcon, defaultLabel: 'Admin', defaultHint: 'Platform oversight' },
]

export default function RoleSelector({ value, onChange }) {
  const { t } = useTranslation()

  return (
    <div>
      <span className="label-text">{t('auth.role')}</span>
      <div className="grid grid-cols-2 gap-2.5">
        {ROLES.map((role) => {
          const Icon = role.icon
          const active = value === role.value
          return (
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              key={role.value}
              onClick={() => onChange(role.value)}
              aria-pressed={active}
              className={`text-left rounded-xl border p-3 transition-all duration-150 ${
                active
                  ? 'border-primary bg-primary-light shadow-sm ring-2 ring-primary/10'
                  : 'border-primary/10 bg-white hover:border-primary/30 hover:bg-primary-light/40'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${active ? 'bg-primary text-white' : 'bg-bg text-primary/70'}`}>
                <Icon />
              </div>
              <p className="text-sm font-bold text-ink">{t(`auth.role.${role.value}`, role.defaultLabel)}</p>
              <p className="text-[10px] text-muted font-medium leading-tight mt-0.5">{t(`auth.role.${role.value}.hint`, role.defaultHint)}</p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function PatientIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
}
function DoctorIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 2v5a3 3 0 0 0 6 0V2M6 8v4a6 6 0 0 0 12 0V8" /><circle cx="19" cy="19" r="3" /></svg>
}
function NgoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" /></svg>
}
function AdminIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" /></svg>
}
