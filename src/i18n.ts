import i18next from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import ro from "./locales/ro.json"

const savedLng = localStorage.getItem("alive_bistro_lng") || "ro"

// Initialize i18next
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ro: { translation: ro },
  },
  lng: savedLng,
  fallbackLng: "ro",
  interpolation: {
    escapeValue: false, // React already safeguards from XSS
  },
})

export default i18next
