/**
 * i18next configuration
 * Supports English (en) and Spanish (es)
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import landingEn from './locales/en/landing.json';
import scorerEn from './locales/en/scorer.json';
import adminEn from './locales/en/admin.json';

import commonEs from './locales/es/common.json';
import authEs from './locales/es/auth.json';
import landingEs from './locales/es/landing.json';
import scorerEs from './locales/es/scorer.json';
import adminEs from './locales/es/admin.json';

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    landing: landingEn,
    scorer: scorerEn,
    admin: adminEn,
  },
  es: {
    common: commonEs,
    auth: authEs,
    landing: landingEs,
    scorer: scorerEs,
    admin: adminEs,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'landing', 'scorer', 'admin'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
