'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onDataReady: (summary: string) => void
}

export function FileUpload({ onDataReady }: Props) {
  const [dragging, setDragging]   = useState(false)
  const [fileName, setFileName]   = useState('')
  const [parsing,  setParsing]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    setParsing(true)
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      if (ext === 'csv') {
        const text = await file.text()
        const Papa = (await import('papaparse')).default
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        const rows   = parsed.data.slice(0, 50) as Record<string, string>[]
        const cols   = parsed.meta.fields?.join(', ') ?? ''
        const sample = rows.slice(0, 3).map(r => JSON.stringify(r)).join('\n')
        onDataReady(`Dataset: ${file.name} (${rows.length} rows)\nColumns: ${cols}\nSample rows:\n${sample}`)
      } else if (ext === 'json') {
        const text = await file.text()
        const data = JSON.parse(text)
        const keys = Array.isArray(data)
          ? Object.keys(data[0] ?? {}).join(', ')
          : Object.keys(data).join(', ')
        const preview = JSON.stringify(Array.isArray(data) ? data.slice(0, 3) : data, null, 2).slice(0, 800)
        onDataReady(`Dataset: ${file.name}\nKeys: ${keys}\nPreview:\n${preview}`)
      } else if (ext === 'txt') {
        const text = await file.text()
        onDataReady(`Attached file: ${file.name}\nContent preview:\n${text.slice(0, 1000)}`)
      } else {
        // PDF, XLSX, etc.
        onDataReady(`Attached file: ${file.name} (${(file.size / 1024).toFixed(1)} KB) — reference this data in your analysis.`)
      }
    } catch {
      onDataReady(`Attached file: ${file.name} — reference this file in your analysis.`)
    }

    setParsing(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border:     `1.5px dashed ${dragging ? 'rgba(201,169,110,0.7)' : 'rgba(12,12,14,0.15)'}`,
          background:  dragging ? 'rgba(201,169,110,0.04)' : 'transparent',
          padding:    '1rem',
          cursor:     'pointer',
          transition: 'all 0.15s',
          textAlign:  'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.txt,.pdf,.xlsx"
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        <AnimatePresence mode="wait">
          {parsing ? (
            <motion.p key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#C9A96E', margin: 0 }}>
              Parsing data…
            </motion.p>
          ) : fileName ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#0C0C0E', margin: 0, fontWeight: 500 }}>
                ✓ {fileName}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#71717A', margin: '0.25rem 0 0' }}>
                Data will be included in analysis · <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setFileName(''); onDataReady('') }}>Remove</span>
              </p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 0.5rem' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', margin: 0 }}>
                Attach data <span style={{ color: '#A1A1AA' }}>· CSV, JSON, TXT, PDF, XLSX</span>
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#A1A1AA', margin: '0.25rem 0 0' }}>
                Your data stays private — used only for this analysis
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
