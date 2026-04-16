'use client'

/**
 * SAIL v2.1 — Dynamic Response Adapter
 *
 * Renders AI responses based on intent classification:
 * - Creative: Executive summaries with visionary matrices
 * - Technical: Full-width code blocks with syntax highlighting
 * - Analytic: Recharts-driven data visualizations and tables
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { SailIntentCategory, SailResponse } from '@/types/chat'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// ── Props ─────────────────────────────────────────────────────────────────────

interface SailAdapterProps {
  intent: SailIntentCategory
  content: string
  data?: SailResponse['chartData']
  codeBlocks?: SailResponse['codeBlocks']
  sections?: SailResponse['sections']
  isStreaming?: boolean
}

// ── Intent Badge ──────────────────────────────────────────────────────────────

function IntentBadge({ intent, confidence }: { intent: SailIntentCategory; confidence?: number }) {
  const { t } = useLanguage()
  
  const config = {
    creative: { 
      bg: 'rgba(124, 58, 237, 0.1)', 
      border: 'rgba(124, 58, 237, 0.3)',
      text: '#7C3AED',
      label: t('sail.creative'),
    },
    technical: { 
      bg: 'rgba(37, 99, 235, 0.1)', 
      border: 'rgba(37, 99, 235, 0.3)',
      text: '#2563EB',
      label: t('sail.technical'),
    },
    analytic: { 
      bg: 'rgba(16, 185, 129, 0.1)', 
      border: 'rgba(16, 185, 129, 0.3)',
      text: '#10B981',
      label: t('sail.analytic'),
    },
  }[intent]

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 0.75rem',
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: '9999px',
      marginBottom: '1rem',
    }}>
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: config.text,
      }}>
        {config.label}
      </span>
      {confidence !== undefined && (
        <span style={{
          fontSize: '0.65rem',
          color: config.text,
          opacity: 0.7,
        }}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  )
}

// ── Executive Summary View (Creative Intent) ──────────────────────────────────

function ExecutiveSummaryView({ content, sections }: { content: string; sections?: SailResponse['sections'] }) {
  const priorityColors = {
    high: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', text: '#DC2626' },
    medium: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', text: '#D97706' },
    low: { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.2)', text: '#16A34A' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Main insight */}
      <div 
        className="prose prose-sm max-w-none dark:prose-invert"
        style={{
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          color: 'var(--foreground)',
        }}
        dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
      />
      
      {/* Strategic sections */}
      {sections && sections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map((section, idx) => {
            const colors = priorityColors[section.priority]
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                style={{
                  padding: '1rem 1.25rem',
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: colors.text,
                    padding: '0.125rem 0.375rem',
                    background: colors.border,
                    borderRadius: '3px',
                  }}>
                    {section.priority}
                  </span>
                  <h4 style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                  }}>
                    {section.title}
                  </h4>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  color: 'var(--foreground)',
                  opacity: 0.85,
                }}>
                  {section.content}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Full-Width Code Block View (Technical Intent) ─────────────────────────────

function CodeBlockView({ content, codeBlocks }: { content: string; codeBlocks?: SailResponse['codeBlocks'] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  
  // Extract code blocks from content if not provided separately
  const extractedBlocks = useMemo(() => {
    if (codeBlocks && codeBlocks.length > 0) return codeBlocks
    
    const blocks: Array<{ language: string; code: string; filename?: string }> = []
    const codeRegex = /```(\w+)?(?:\s*(?:\/\/|#)\s*(\S+))?\n([\s\S]*?)```/g
    let match
    
    while ((match = codeRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        filename: match[2],
        code: match[3].trim(),
      })
    }
    
    return blocks
  }, [content, codeBlocks])

  const handleCopy = async (code: string, idx: number) => {
    await navigator.clipboard.writeText(code)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  // Remove code blocks from content for prose
  const proseContent = useMemo(() => {
    return content.replace(/```[\s\S]*?```/g, '').trim()
  }, [content])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Prose explanation */}
      {proseContent && (
        <div 
          className="prose prose-sm max-w-none dark:prose-invert"
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: 'var(--foreground)',
          }}
          dangerouslySetInnerHTML={{ __html: formatMarkdown(proseContent) }}
        />
      )}
      
      {/* Code blocks - full width */}
      {extractedBlocks.map((block, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.1)',
            background: '#1E1E1E',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#A78BFA',
              }}>
                {block.language}
              </span>
              {block.filename && (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  {block.filename}
                </span>
              )}
            </div>
            <button
              onClick={() => handleCopy(block.code, idx)}
              style={{
                padding: '0.25rem 0.5rem',
                background: copiedIdx === idx ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: copiedIdx === idx ? '#22C55E' : 'rgba(255,255,255,0.7)',
                fontSize: '0.7rem',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              {copiedIdx === idx ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          {/* Code content */}
          <pre style={{
            margin: 0,
            padding: '1rem',
            overflow: 'auto',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            color: '#E4E4E7',
          }}>
            <code>{block.code}</code>
          </pre>
        </motion.div>
      ))}
    </div>
  )
}

// ── Data Visualization View (Analytic Intent) ─────────────────────────────────

function DataVizView({ content, data }: { content: string; data?: SailResponse['chartData'] }) {
  // Extract tables from markdown content
  const { prose, tables } = useMemo(() => {
    const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)+)/g
    const foundTables: Array<{ headers: string[]; rows: string[][] }> = []
    let proseContent = content
    
    let match
    while ((match = tableRegex.exec(content)) !== null) {
      const fullTable = match[0]
      const lines = fullTable.trim().split('\n')
      
      if (lines.length >= 2) {
        const headers = lines[0].split('|').filter(h => h.trim()).map(h => h.trim())
        const rows = lines.slice(2).map(line => 
          line.split('|').filter(c => c.trim()).map(c => c.trim())
        )
        foundTables.push({ headers, rows })
      }
      
      proseContent = proseContent.replace(fullTable, '')
    }
    
    return { prose: proseContent.trim(), tables: foundTables }
  }, [content])

  const chartColors = ['#7C3AED', '#2563EB', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Prose analysis */}
      {prose && (
        <div 
          className="prose prose-sm max-w-none dark:prose-invert"
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: 'var(--foreground)',
          }}
          dangerouslySetInnerHTML={{ __html: formatMarkdown(prose) }}
        />
      )}
      
      {/* Chart visualization */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            padding: '1.5rem',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        >
          {data.title && (
            <h4 style={{
              margin: '0 0 1rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--foreground)',
            }}>
              {data.title}
            </h4>
          )}
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              {data.type === 'line' ? (
                <LineChart data={data.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey={data.xKey} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  {data.yKeys.map((key, idx) => (
                    <Line 
                      key={key} 
                      type="monotone" 
                      dataKey={key} 
                      stroke={chartColors[idx % chartColors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              ) : data.type === 'bar' ? (
                <BarChart data={data.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey={data.xKey} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  {data.yKeys.map((key, idx) => (
                    <Bar 
                      key={key} 
                      dataKey={key} 
                      fill={chartColors[idx % chartColors.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              ) : (
                <AreaChart data={data.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey={data.xKey} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  {data.yKeys.map((key, idx) => (
                    <Area 
                      key={key} 
                      type="monotone" 
                      dataKey={key} 
                      fill={chartColors[idx % chartColors.length]}
                      fillOpacity={0.2}
                      stroke={chartColors[idx % chartColors.length]}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
      
      {/* Data tables - full width with horizontal scroll */}
      {tables.map((table, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          style={{
            width: '100%',
            overflow: 'auto',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          <table style={{
            width: '100%',
            minWidth: '600px',
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
          }}>
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                {table.headers.map((h, i) => (
                  <th 
                    key={i}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIdx) => (
                <tr 
                  key={rowIdx}
                  style={{ 
                    background: rowIdx % 2 === 0 ? 'transparent' : 'var(--muted)',
                  }}
                >
                  {row.map((cell, cellIdx) => (
                    <td 
                      key={cellIdx}
                      style={{
                        padding: '0.625rem 1rem',
                        color: 'var(--foreground)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ))}
    </div>
  )
}

// ── Markdown Formatter Helper ─────────────────────────────────────────────────

function formatMarkdown(text: string): string {
  // Basic markdown to HTML conversion
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:600;margin:1.25rem 0 0.5rem;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.125rem;font-weight:600;margin:1.5rem 0 0.625rem;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.25rem;font-weight:700;margin:1.75rem 0 0.75rem;">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125em;">$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li style="margin:0.25rem 0;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin:0.75rem 0;padding-left:1.25rem;">$&</ul>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p style="margin:0.75rem 0;">')
    // Wrap in paragraph
    .replace(/^(.+)$/s, '<p style="margin:0;">$1</p>')
}

// ── Main Adapter Component ────────────────────────────────────────────────────

export function SailAdapter({
  intent,
  content,
  data,
  codeBlocks,
  sections,
  isStreaming = false,
}: SailAdapterProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        width: '100%',
        padding: '1.25rem',
      }}
    >
      {/* Intent indicator */}
      <IntentBadge intent={intent} />
      
      {/* Streaming indicator */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              background: '#7C3AED',
              borderRadius: '50%',
              animation: 'pulse 1s infinite',
            }} />
            Analyzing...
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic content based on intent */}
      {intent === 'creative' && (
        <ExecutiveSummaryView content={content} sections={sections} />
      )}
      {intent === 'technical' && (
        <CodeBlockView content={content} codeBlocks={codeBlocks} />
      )}
      {intent === 'analytic' && (
        <DataVizView content={content} data={data} />
      )}
    </motion.div>
  )
}

// ── Streaming Text Adapter ────────────────────────────────────────────────────

interface StreamingAdapterProps {
  intent: SailIntentCategory
  chunks: string[]
  isComplete: boolean
}

export function StreamingSailAdapter({ intent, chunks, isComplete }: StreamingAdapterProps) {
  const content = chunks.join('')
  
  return (
    <SailAdapter
      intent={intent}
      content={content}
      isStreaming={!isComplete}
    />
  )
}
