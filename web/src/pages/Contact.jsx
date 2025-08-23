import React from 'react'

export default function Contact() {
  return (
  // Simple static contact page (placeholder address)
    <div className="card p-6 md:p-8">
      <h1 className="text-2xl font-semibold">Contact</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Questions or feedback? Please reach out via GitHub.
      </p>
      <ul className="mt-4 list-disc list-inside text-slate-700 dark:text-slate-200">
        <li>
          Open an issue on the repository: <a className="text-brand-600 hover:underline" href="https://github.com/trbirmin/ParentHelper/issues" target="_blank" rel="noreferrer noopener">github.com/trbirmin/ParentHelper/issues</a>
        </li>
        <li>
          Or start a discussion: <a className="text-brand-600 hover:underline" href="https://github.com/trbirmin/ParentHelper/discussions" target="_blank" rel="noreferrer noopener">github.com/trbirmin/ParentHelper/discussions</a>
        </li>
      </ul>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        We review messages regularly and appreciate your ideas.
      </p>
    </div>
  )
}
