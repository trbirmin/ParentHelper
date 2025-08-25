// Simple i18n setup with react-i18next. We inline a tiny resource bundle
// for demo; you can split JSON per language later and lazy-load.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
  title: 'Homework made easy for parents.',
  subtitle: 'Upload a worksheet, snap a photo, or ask a question. Get simple, step‑by‑step guidance you can explain with confidence.',
  slogan: 'Guidance you get, support they need.',
      upload: 'Upload file',
      camera: 'Take picture',
      question: 'Type or speak a question',
      submit: 'Submit',
      clear: 'Clear',
      results: 'Results',
      answer: 'Answer',
      explanation: 'Explanation'
    }
  },
  es: {
    translation: {
  title: 'Haz que la tarea sea sin estrés — para ti y tu hijo',
  subtitle: 'Sube una hoja, toma una foto o haz una pregunta. Recibe explicaciones claras, paso a paso y fáciles para padres.',
  slogan: 'Orientación para ti, apoyo para ellos.',
      upload: 'Subir archivo',
      camera: 'Tomar foto',
      question: 'Escribe o di una pregunta',
      submit: 'Enviar',
      clear: 'Limpiar',
      results: 'Resultados',
      answer: 'Respuesta',
      explanation: 'Explicación'
    }
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  })

export default i18n
