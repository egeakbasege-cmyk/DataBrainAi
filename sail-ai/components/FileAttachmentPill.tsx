'use client'

import { motion } from 'framer-motion'

export interface Attachment {
  name:     string
  size:     number
  mimeType: string
  isImage:  boolean
  content:  string   // base64 for images, extracted text for others
  preview?: string   // image preview URL (objectURL)
}

interface Props {
  attachment: Attachment
  analyzing?: boolean
  onRemove:   () => void
}

function fmt(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
  if (mimeType === 'application/pdf') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="9" y1="9" x2="10" y2="9"/>
    </svg>
  )
  // CSV / XLSX / default
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  )
}

export function FileAttachmentPill({ attachment, analyzing, onRemove }: Props) {
  const maxName = 22
  const displayName = attachment.name.length > maxName
    ? attachment.name.slice(0, maxName - 1) + '…'
    : attachment.name

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          '0.5rem',
        padding:      '0.375rem 0.5rem 0.375rem 0.625rem',
        background:   'rgba(201,169,110,0.06)',
        border:       '1px solid rgba(201,169,110,0.3)',
        borderRadius: '6px',
        maxWidth:     '280px',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Shimmer overlay when analyzing */}
      {analyzing && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.15), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Image thumbnail or file icon */}
      {attachment.isImage && attachment.preview ? (
        <img
          src={attachment.preview}
          alt={attachment.name}
          style={{ width: 22, height: 22, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{ flexShrink: 0 }}>
          <FileTypeIcon mimeType={attachment.mimeType} />
        </div>
      )}

      {/* Name + size */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem', minWidth: 0 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 500, color: '#0C0C0E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {analyzing ? 'Analysing…' : displayName}
        </span>
        {!analyzing && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#A1A1AA' }}>
            {fmt(attachment.size)}
          </span>
        )}
      </div>

      {/* Remove button */}
      {!analyzing && (
        <button
          onClick={onRemove}
          aria-label="Remove attachment"
          style={{
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
            width:       16,
            height:      16,
            borderRadius:'50%',
            background:  'rgba(0,0,0,0.08)',
            border:      'none',
            cursor:      'pointer',
            flexShrink:  0,
            padding:     0,
            color:       '#71717A',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </motion.div>
  )
}
