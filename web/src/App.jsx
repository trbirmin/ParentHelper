import React from 'react'
import Navbar from './components/Navbar'
import SubjectsBlade from '@/components/SubjectsBlade'

// App shell: renders the Navbar and a centered main content container

export default function App({ children }) {
  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[24rem_1fr] gap-6">
        <SubjectsBlade inline open />
        <main>{children}</main>
      </div>
    </div>
  )
}
