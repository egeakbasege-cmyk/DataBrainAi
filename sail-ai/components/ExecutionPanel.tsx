'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Milestone, Code2, CheckCircle2, Circle } from 'lucide-react'

interface Task {
  id: string
  label: string
  done: boolean
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', label: 'Define target market segment',       done: false },
  { id: '2', label: 'Benchmark competitive landscape',    done: false },
  { id: '3', label: 'Run TRIM diagnostic',                done: false },
  { id: '4', label: 'Generate SAIL strategic narrative',  done: false },
  { id: '5', label: 'Launch CATAMARAN dual-track',        done: false },
  { id: '6', label: 'Export captain\'s log',              done: false },
]

interface ExecutionPanelProps {
  open: boolean
  onClose: () => void
}

export function ExecutionPanel({ open, onClose }: ExecutionPanelProps) {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS)

  const toggle = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const completed = tasks.filter(t => t.done).length
  const pct = Math.round((completed / tasks.length) * 100)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ep-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="ep-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #0A0A0F 0%, #0E0E18 100%)',
              borderLeft: '1px solid rgba(212,175,55,0.20)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
              <div className="flex items-center gap-3">
                <Milestone size={18} style={{ color: '#D4AF37' }} />
                <span className="font-playfair text-base font-bold italic tracking-wide"
                  style={{ color: '#F0C030' }}>
                  Execute Mode
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-sm p-1 transition-colors hover:bg-white/10"
                aria-label="Close panel"
              >
                <X size={16} style={{ color: '#B8C4CC' }} />
              </button>
            </div>

            {/* Caption */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: '#B8C4CC' }}>
                Captain&apos;s Log
              </p>
              <div className="mt-3 h-1 w-full rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--gold-grad, #D4AF37)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="mt-1 text-right text-xs" style={{ color: '#D4AF37' }}>
                {completed}/{tasks.length} complete
              </p>
            </div>

            {/* Task list */}
            <ul className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
              {tasks.map((task, i) => (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggle(task.id)}
                  className="flex items-center gap-3 cursor-pointer rounded-sm px-3 py-3 transition-all"
                  style={{
                    background: task.done ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${task.done ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {task.done
                    ? <CheckCircle2 size={16} style={{ color: '#D4AF37', flexShrink: 0 }} />
                    : <Circle       size={16} style={{ color: '#555566', flexShrink: 0 }} />
                  }
                  <span
                    className="text-sm"
                    style={{
                      color: task.done ? '#D4AF37' : '#C8C8D8',
                      textDecoration: task.done ? 'line-through' : 'none',
                    }}
                  >
                    {task.label}
                  </span>
                </motion.li>
              ))}
            </ul>

            {/* Footer */}
            <div className="px-6 py-5" style={{ borderTop: '1px solid rgba(212,175,55,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Code2 size={14} style={{ color: '#B8C4CC' }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: '#B8C4CC' }}>
                  Session Active
                </span>
                <span
                  className="ml-auto inline-block h-2 w-2 rounded-full"
                  style={{ background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }}
                />
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm font-bold tracking-widest uppercase transition-all hover:opacity-90"
                style={{
                  background: 'var(--summer-yellow, #F0C030)',
                  color: '#000000',
                  border: '2px solid #CC2200',
                }}
              >
                Close Log
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
