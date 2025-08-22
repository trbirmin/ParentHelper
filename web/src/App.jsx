import React from 'react'
import Navbar from './components/Navbar'

// App shell: renders the Navbar and a centered main content container

export default function App({ children }) {
  return (
    <div>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
