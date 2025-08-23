import React, { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const { i18n } = useTranslation()
  const changeLang = (e) => i18n.changeLanguage(e.target.value)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')
  const [contrast, setContrast] = useState(() => document.documentElement.getAttribute('data-contrast') || 'normal')
  const [font, setFont] = useState(() => document.documentElement.getAttribute('data-font') || 'default')

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  useEffect(() => { document.documentElement.setAttribute('data-contrast', contrast) }, [contrast])
  useEffect(() => { document.documentElement.setAttribute('data-font', font) }, [font])
  // Utility to style active vs inactive route links; avoid hardcoding dark text so it inherits theme
  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'bg-brand-100 text-brand-800' : 'hover:bg-slate-100/60'}`
  return (
    // Sticky-looking translucent header with blur and simple nav
  <header className="navbar card rounded-none border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-brand-500" />
          <span className="font-semibold text-lg">Parent Homework Helper</span>
        </Link>
        <nav className="flex items-center gap-2">
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
      </div>
    </header>
  )
}
