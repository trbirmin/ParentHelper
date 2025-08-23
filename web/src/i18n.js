import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Minimal translations just for demo; extend as needed
const resources = {
	en: {
		translation: {
			Home: 'Home',
			About: 'About',
			Contact: 'Contact',
			'Parent Homework Helper': 'Parent Homework Helper',
		},
	},
	es: {
		translation: {
			Home: 'Inicio',
			About: 'Acerca de',
			Contact: 'Contacto',
			'Parent Homework Helper': 'Ayudante de Tareas para Padres',
		},
	},
}

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'en',
		interpolation: { escapeValue: false },
		detection: { order: ['querystring', 'localStorage', 'navigator'], caches: ['localStorage'] },
	})

export default i18n
