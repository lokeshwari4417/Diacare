// i18n scaffold (Section 3.1): adding a language is a translation-file
// change, not a code change -- drop a new locale JSON in ./locales and
// register it below.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'
import hi from './locales/hi.json'

const resources = {
  en: { translation: en },
  es: { translation: es },
  hi: { translation: hi },
}

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('diacare_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
