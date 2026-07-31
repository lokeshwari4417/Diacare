import React, { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

const RotatingTorus = React.lazy(() => import('./RotatingTorus'))

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.warn("R3F 3D Torus failed to render. Falling back to SVG:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function TorusFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg className="w-56 h-56 animate-breathe text-primary/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="12" />
      </svg>
    </div>
  )
}

export default function AuthShell({ children }) {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-bg text-ink">
      {/* Form column */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 py-12 lg:px-16 bg-white relative">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <LogoMark />
            <span className="font-display font-bold text-2xl text-primary">DiaCare</span>
          </div>
          
          <div className="glass-card !bg-white/50 !p-7 shadow-soft border-primary/5">
            {children}
          </div>

          <p className="text-center text-xs text-muted">
            {t('disclaimer.title')} &middot; DiaCare
          </p>
        </div>
      </div>

      {/* 3D Sidebar column */}
      <div className="hidden lg:col-span-7 lg:flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary-light to-secondary/10 px-12 text-center">
        {/* Animated wave line */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute top-[65%] w-full opacity-20" height="120" viewBox="0 0 1200 120" fill="none">
            <path
              d="M0 60 L280 60 L320 20 L360 100 L400 40 L440 60 L1200 60"
              stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="1400" className="animate-wave"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-lg space-y-4">
          <h2 className="text-3xl font-display font-extrabold text-ink leading-tight">
            {t('app.tagline')}
          </h2>
          <p className="text-sm font-semibold text-muted max-w-sm mx-auto leading-relaxed">
            {t('disclaimer.text')}
          </p>
        </div>

        <div className="relative w-full h-[380px] max-w-md">
          <ErrorBoundary fallback={<TorusFallback />}>
            <Suspense fallback={<TorusFallback />}>
              <RotatingTorus />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

function LogoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="#EFF6FF" />
      <path d="M16 6c4 5 7 8.5 7 12.5A7 7 0 1 1 9 18.5C9 14.5 12 11 16 6Z" fill="#2563EB" />
    </svg>
  )
}
