import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import lv from './lv';

const deviceLanguage = getLocales().at(0)?.languageCode ?? 'en';

/** Resolve the effective UI language from the user's choice ('auto' follows the device). */
export function resolveLanguage(choice: 'auto' | 'lv' | 'en'): 'lv' | 'en' {
  if (choice === 'lv' || choice === 'en') return choice;
  return deviceLanguage === 'lv' ? 'lv' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    lv: { translation: lv },
  },
  lng: deviceLanguage === 'lv' ? 'lv' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
