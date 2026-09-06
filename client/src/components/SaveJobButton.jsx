import { useState } from 'react'
import api from '../services/api'

const BookmarkIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2h12v18l-6-3-6 3V2z" fill={filled ? '#2563EB' : 'none'} stroke={filled ? '#2563EB' : 'currentColor'} strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
)

const SaveJobButton = ({ jobId, status, initialSaved = false, jobStatus }) => {
  const jsStatus = jobStatus ?? status
  const storageKey = `saved_job_${jobId}`
  const [saved, setSaved] = useState(() => {
    // Check localStorage first, then initialSaved
    const stored = localStorage.getItem(storageKey)
    return stored !== null ? stored === 'true' : initialSaved
  })
  const [busy, setBusy] = useState(false)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (jsStatus !== 'open' || busy) return

    const prev = saved
    const newState = !prev
    setSaved(newState)
    localStorage.setItem(storageKey, String(newState))
    setBusy(true)
    
    try {
      await api.post(`/jobs/${jobId}/save`)
    } catch {
      setSaved(prev)
      localStorage.setItem(storageKey, String(prev))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={jsStatus !== 'open'}
      aria-pressed={saved}
      style={{
        background: saved ? 'rgba(37,99,235,0.1)' : 'rgba(107,114,128,0.12)',
        border: `1px solid ${saved ? 'rgba(37,99,235,0.25)' : 'rgba(107,114,128,0.2)'}`,
        borderRadius: 7,
        padding: '5px 7px',
        cursor: jsStatus !== 'open' ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        color: saved ? '#2563EB' : 'var(--text-secondary, #6b7280)',
        opacity: jsStatus !== 'open' ? 0.5 : 1,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      title={saved ? 'Saved' : 'Save job'}
    >
      <BookmarkIcon filled={saved} />
    </button>
  )
}

export default SaveJobButton
