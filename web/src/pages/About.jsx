import React from 'react'

export default function About() {
  return (
    // Themed card with consistent headings and section dividers
    <div className="card p-6 md:p-8">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold">About Parent Homework Helper</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          We make schoolwork simpler for families—focusing on clarity and confidence, not shortcuts.
        </p>
      </header>

      <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
        <section className="pt-4 first:pt-0">
          <h2 className="text-lg font-semibold">What it does</h2>
          <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200">
            <li>Scan worksheets or take a photo—OCR extracts the question.</li>
            <li>Type a question and get a clear answer with an explanation.</li>
            <li>Show optional steps when helpful (math, definitions, time).</li>
            <li>Translate answers side-by-side with English.</li>
            <li>Crop images before submitting to focus on what matters.</li>
          </ul>
        </section>

        <section className="pt-6">
          <h2 className="text-lg font-semibold">How it works</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The app runs securely in your browser and talks to a small backend that uses trusted Azure services:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200">
            <li>Document Intelligence for OCR (reading photos and documents)</li>
            <li>Optional Azure OpenAI for general answers and explanations</li>
            <li>Azure Translator for bilingual output</li>
          </ul>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            When AI isn’t available, simple fallbacks (math, definitions, time) keep things reliable.
          </p>
        </section>

        <section className="pt-6">
          <h2 className="text-lg font-semibold">Privacy first</h2>
          <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200">
            <li>No keys or secrets are stored in the browser.</li>
            <li>Only the minimum data needed is sent to the API.</li>
            <li>Clear results anytime; no account required.</li>
          </ul>
        </section>

        <section className="pt-6">
          <h2 className="text-lg font-semibold">Accessible by design</h2>
          <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200">
            <li>Dark mode, high contrast, and dyslexic-friendly font.</li>
            <li>Clear headings, readable spacing, and keyboard-friendly controls.</li>
            <li>Language picker with instant UI translation for supported labels.</li>
          </ul>
        </section>

        <section className="pt-6">
          <h2 className="text-lg font-semibold">Why we built this</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Homework can be stressful. We aim to reduce frustration and help families learn together with
            straightforward guidance and respectful explanations.
          </p>
        </section>

        <section className="pt-6">
          <h2 className="text-lg font-semibold">Get in touch</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Questions or ideas? Visit the Contact page to share feedback—we’re listening and improving regularly.
          </p>
        </section>
      </div>
    </div>
  )
}
