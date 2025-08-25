import React from 'react'
import Navbar from './components/Navbar'
import SubjectsBlade from '@/components/SubjectsBlade'

// App shell: renders the Navbar and a centered main content container

export default function App({ children }) {
  return (
    <div className="pt-[max(env(safe-area-inset-top),0px)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[24rem_1fr] gap-6">
        <SubjectsBlade inline open />
        <main>{children}</main>
      </div>
      <footer className="border-t border-slate-200 pb-[max(env(safe-area-inset-bottom),0px)]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-brand-50 text-brand-800 border border-brand-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-80">
                <path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z" />
                <path d="M7 14a3 3 0 006 0H7z" />
              </svg>
              Guidance you get, support they need.
            </span>
          </div>
          <div className="mt-4 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Parent Homework Helper
          </div>
        </div>
      </footer>
    </div>
  )
}
