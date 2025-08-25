import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
// Global Tailwind styles
import './index.css'
// App shell (navbar + container)
import App from './App'
// Route components
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Subjects from './pages/Subjects'
import 'katex/dist/katex.min.css'
import './i18n'

// Mount the React app and configure client-side routing
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </App>
    </BrowserRouter>
  </React.StrictMode>
)
