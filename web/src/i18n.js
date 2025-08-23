// Simple i18n setup with react-i18next. We inline a tiny resource bundle
// for demo; you can split JSON per language later and lazy-load.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
	en: {
		translation: {
			title: 'Help your child with homework, confidently',
			subtitle: "Upload a worksheet, snap a picture, or type a question. We'll guide you with clear, parent-friendly explanations.",
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
			title: 'Ayuda a tu hijo con la tarea, con confianza',
			subtitle: 'Sube una hoja de trabajo, toma una foto o escribe una pregunta. Te guiaremos con explicaciones claras y sencillas.',
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
