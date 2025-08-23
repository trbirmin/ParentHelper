import React, { useState } from 'react'
import UploadCard from '@/components/UploadCard'
import CameraCard from '@/components/CameraCard'
import QuestionCard from '@/components/QuestionCard'
import SubjectsBlade from '@/components/SubjectsBlade'

export default function Home() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Reserved for other test buttons if needed
  const callApi = async (endpoint, body) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || { example: true })
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="text-center py-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Help your child with homework, confidently</h1>
        <p className="text-slate-600 max-w-3xl mx-auto">Upload a worksheet, snap a picture, or type a question. We’ll guide you with clear, parent-friendly explanations.</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-6 items-start">
        <div>
          <SubjectsBlade inline open onSelect={(s)=>console.log('Subject selected:', s)} />
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <UploadCard onResult={setResult} onClear={()=>setResult(null)} />
          <CameraCard onResult={setResult} onClear={()=>setResult(null)} />
          <QuestionCard onResult={setResult} onClear={()=>setResult(null)} />
        </div>
      </section>

      {result && (
        <section className="card p-5">
          <h3 className="font-semibold mb-2">API response</h3>
          <pre className="text-sm bg-slate-50 p-3 rounded-xl overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </div>
  )
}
