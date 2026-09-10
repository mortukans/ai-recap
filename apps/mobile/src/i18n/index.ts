import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import lv from './lv';

const deviceLanguage = getLocales().at(0)?.languageCode ?? 'en';

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
