// ClimaLens — i18n Configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import si from './si.json';
import ta from './ta.json';
import { useSettingsStore } from '../store/settingsStore';

// Read persisted language from store (synchronous access via getState)
const persistedLang = useSettingsStore.getState().language || 'en';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      si: { translation: si },
      ta: { translation: ta },
    },
    lng: persistedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
