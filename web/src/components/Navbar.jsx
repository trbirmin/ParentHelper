import React from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'bg-brand-100 text-brand-800' : 'text-slate-700 hover:bg-slate-100'}`
  return (
    <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-brand-500" />
          <span className="font-semibold text-lg">Parent Homework Helper</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={linkCls} end>Home</NavLink>
          <NavLink to="/about" className={linkCls}>About</NavLink>
          <NavLink to="/contact" className={linkCls}>Contact</NavLink>
        </nav>
      </div>
    </header>
  )
}
