import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en.json';

// UI-11: every UI string comes from here. English is the only language in v1;
// a new language is one more JSON file in `resources`.
const resources = { en: { translation: en } } as const;

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  supportedLngs: Object.keys(resources),
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
