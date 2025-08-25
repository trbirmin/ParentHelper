import React, { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const { i18n } = useTranslation()
  const changeLang = (e) => i18n.changeLanguage(e.target.value)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')
  const [contrast, setContrast] = useState(() => document.documentElement.getAttribute('data-contrast') || 'normal')
  const [font, setFont] = useState(() => document.documentElement.getAttribute('data-font') || 'default')
  const [open, setOpen] = useState(false)

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  useEffect(() => { document.documentElement.setAttribute('data-contrast', contrast) }, [contrast])
  useEffect(() => { document.documentElement.setAttribute('data-font', font) }, [font])
  // Utility to style active vs inactive route links; avoid hardcoding dark text so it inherits theme
  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'bg-brand-100 text-brand-800' : 'hover:bg-slate-100/60'}`
  return (
    // Sticky translucent header with blur
  <header className="navbar card rounded-none border-b border-slate-200 sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-brand-500" />
          <span className="font-semibold text-lg">Parent Homework Helper</span>
        </Link>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" className={linkCls} end>Home</NavLink>
          <NavLink to="/about" className={linkCls}>About</NavLink>
          <NavLink to="/contact" className={linkCls}>Contact</NavLink>
          <select onChange={changeLang} defaultValue={i18n.language} className="input w-auto text-sm py-1" aria-label="Language">
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
          <select value={theme} onChange={(e)=>setTheme(e.target.value)} className="input w-auto text-sm px-3 py-2 min-w-[6rem]" aria-label="Theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <select value={contrast} onChange={(e)=>setContrast(e.target.value)} className="input w-auto text-sm px-3 py-2 min-w-[7rem]" aria-label="Contrast">
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
          <select value={font} onChange={(e)=>setFont(e.target.value)} className="input w-auto text-sm px-3 py-2 min-w-[8rem]" aria-label="Font">
            <option value="default">Default</option>
            <option value="dyslexic">Dyslexic</option>
          </select>
        </nav>
        {/* Mobile menu button */}
        <button
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
          aria-label="Menu"
          aria-controls="mobile-menu"
          aria-expanded={open ? 'true' : 'false'}
          onClick={()=>setOpen(o=>!o)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {/* Mobile collapsible panel */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 grid gap-3">
            <div className="flex gap-2">
              <NavLink to="/" className={linkCls} end onClick={()=>setOpen(false)}>Home</NavLink>
              <NavLink to="/about" className={linkCls} onClick={()=>setOpen(false)}>About</NavLink>
              <NavLink to="/contact" className={linkCls} onClick={()=>setOpen(false)}>Contact</NavLink>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select onChange={changeLang} defaultValue={i18n.language} className="input text-sm" aria-label="Language">
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <select value={theme} onChange={(e)=>setTheme(e.target.value)} className="input text-sm" aria-label="Theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <select value={contrast} onChange={(e)=>setContrast(e.target.value)} className="input text-sm col-span-2" aria-label="Contrast">
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
              <select value={font} onChange={(e)=>setFont(e.target.value)} className="input text-sm col-span-2" aria-label="Font">
                <option value="default">Default</option>
                <option value="dyslexic">Dyslexic</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
