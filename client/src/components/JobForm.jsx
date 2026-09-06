import { useEffect, useRef, useState } from 'react'

const JOB_TYPES = ["full-time", "part-time", "internship", "contract"];

const MAX_DESC = 2000
const MAX_REQS = 1000

const JobForm = ({
  form,
  errors,
  requirements,
  onChange,
  onUpdateRequirement,
  onAddRequirement,
  onRemoveRequirement,
  onSubmit,
  submitting,
  submitError,
  submitLabel,
  cancelLabel,
  onCancel,
  jobCategory,
}) => {
  const [dirty, setDirty] = useState(false)
  const initialRef = useRef(JSON.stringify(form))
  const formRef = useRef(null)

  useEffect(() => {
    // mark dirty when form changes from initial
    setDirty(JSON.stringify(form) !== initialRef.current)
  }, [form])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    const handlePop = () => {
      if (!dirty) return
      const ok = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!ok) window.history.pushState(null, '')
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePop)
    // catch link clicks
    const handleLinkClick = (e) => {
      const a = e.target.closest && e.target.closest('a')
      if (!a || a.origin !== window.location.origin) return
      if (!dirty) return
      const ok = window.confirm('You have unsaved changes. Leave without saving?')
      if (!ok) e.preventDefault()
    }
    document.addEventListener('click', handleLinkClick)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePop)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [dirty])

  const descCount = form.description ? form.description.length : 0
  const reqChars = requirements.join(' ').length

  return (
    <form ref={formRef} onSubmit={onSubmit} style={s.form} noValidate>
      <div style={s.stickyHeader}>
        <div style={s.headerInner}>
          <div style={s.headerTitle}>{form.title || 'Edit Job'}</div>
          <div style={s.headerMeta}>{form.company || ''}</div>
        </div>
      </div>

      <div style={s.grid}>
        <div style={s.col}>
          <label style={s.label}>Job Title <span style={{ color: '#ef4444' }}>*</span></label>
          <input style={{ ...s.input, ...(errors.title ? s.inputErr : {}) }} type="text" placeholder="e.g. Senior Frontend Engineer" value={form.title} onChange={onChange('title')} />
          {errors.title && <p style={s.ferr}>{errors.title}</p>}
        </div>

        <div style={s.col}>
          <label style={s.label}>Company <span style={{ color: '#ef4444' }}>*</span></label>
          <input style={{ ...s.input, ...(errors.company ? s.inputErr : {}) }} type="text" placeholder="e.g. Acme Corp" value={form.company} onChange={onChange('company')} />
          {errors.company && <p style={s.ferr}>{errors.company}</p>}
        </div>

        <div style={s.col}>
          <label style={s.label}>Location <span style={{ color: '#ef4444' }}>*</span></label>
          <input style={{ ...s.input, ...(errors.location ? s.inputErr : {}) }} type="text" placeholder="e.g. Cairo, Egypt" value={form.location} onChange={onChange('location')} />
          {errors.location && <p style={s.ferr}>{errors.location}</p>}
        </div>

        <div style={s.col}>
          <label style={s.label}>Job Type <span style={{ color: '#ef4444' }}>*</span></label>
          <select style={s.input} value={form.type} onChange={onChange('type')}>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          {errors.type && <p style={s.ferr}>{errors.type}</p>}
        </div>

        <div style={s.col}>
          <label style={s.label}>Status <span style={{ color: '#ef4444' }}>*</span></label>
          <select style={s.input} value={form.status} onChange={onChange('status')}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          {errors.status && <p style={s.ferr}>{errors.status}</p>}
        </div>

        <div style={s.col}>
          <label style={s.label}>Salary (USD/yr) <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af' }}>optional</span></label>
          <input style={{ ...s.input, ...(errors.salary ? s.inputErr : {}) }} type="number" min={0} placeholder="e.g. 60000" value={form.salary} onChange={onChange('salary')} />
          {errors.salary && <p style={s.ferr}>{errors.salary}</p>}
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={s.label}>Description <span style={{ color: '#ef4444' }}>*</span> <span style={s.aiBadge} title="AI will auto-classify category">✨ AI will auto-classify category</span></label>
          <textarea style={{ ...s.input, minHeight: 140, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', ...(errors.description ? s.inputErr : {}) }} rows={6} placeholder="Describe the role and responsibilities…" value={form.description} onChange={onChange('description')} />
          <div style={s.rowBetween}><div>{errors.description && <p style={s.ferr}>{errors.description}</p>}</div><div style={s.counter}>{descCount} / {MAX_DESC} characters</div></div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={s.label}>Requirements <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {requirements.map((req, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input style={{ ...s.input, flex: 1 }} type="text" placeholder={`Requirement ${index + 1}`} value={req} onChange={(e) => onUpdateRequirement(index, e.target.value)} />
                      {requirements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveRequirement(index)}
                          style={s.removeReqBtn}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                        >×</button>
                      )}
              </div>
            ))}
          </div>
          {errors.requirements && <p style={s.ferr}>{errors.requirements}</p>}
          <div style={s.rowBetween}><button type="button" onClick={onAddRequirement} style={s.addReqBtn} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>+ Add Requirement</button><div style={s.counter}>{reqChars} / {MAX_REQS} characters</div></div>
        </div>
      </div>

      {jobCategory && (<div style={s.categoryCard}><strong>AI-assigned category:</strong> {jobCategory}</div>)}

      {submitError && (<div style={s.errorBanner}><span style={s.errorIcon}>⚠️</span><div><p style={s.errorTitle}>Cannot Post Job</p><p style={s.errorText}>{submitError}</p></div></div>)}

      <div style={s.actionBar}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {onCancel && (
            <button
              type="button"
              onClick={()=>{ if(dirty){ if(!window.confirm('You have unsaved changes. Cancel without saving?')) return } onCancel() }}
              style={s.cancelBtn}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.97)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >{cancelLabel || 'Cancel'}</button>
          )}
          <button
            type="submit"
            style={s.submitBtn}
            disabled={submitting}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.3)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2563EB'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >{submitting ? submitLabel : submitLabel}</button>
        </div>
      </div>
    </form>
  )
}

const s = {
  form: {
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  stickyHeader: {
    position: 'sticky',
    top: 0,
    background: 'var(--card-bg)',
    zIndex: 5,
    borderRadius: '12px 12px 0 0',
    paddingBottom: '0.5rem',
    marginBottom: '0.25rem',
    borderBottom: '1px solid var(--border)',
  },
  headerInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  headerTitle: { fontWeight: 700, color: 'var(--text-primary)' },
  headerMeta: { color: 'var(--text-secondary)', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  col: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  input: {
    padding: "0.75rem 1rem",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "var(--card-bg)",
    color: "var(--text-primary)",
  },
  inputErr: {
    borderColor: "#ef4444",
    background: "rgba(239,68,68,0.08)",
  },
  ferr: {
    color: "#ef4444",
    fontSize: "0.8rem",
    margin: 0,
  },
  cancelBtn: {
    padding: "0.5rem 1.25rem",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    color: "var(--text-primary)",
    minWidth: 44,
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    padding: "0.5rem 1.5rem",
    background: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    minHeight: 44,
    minWidth: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReqBtn: {
    alignSelf: "flex-start",
    padding: "0.4rem 1rem",
    background: "rgba(37,99,235,0.1)",
    color: "#2563EB",
    border: "1px solid rgba(37,99,235,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    minHeight: 44,
    minWidth: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeReqBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    background: "rgba(239,68,68,0.12)",
    color: "#ef4444",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: "1.1rem",
  },
  noticeBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    background: "rgba(91,33,182,0.08)",
    border: "1px solid rgba(167,139,250,0.3)",
    borderRadius: 10,
    padding: "1rem",
  },
  noticeIcon: {
    fontSize: "1.25rem",
    flexShrink: 0,
  },
  noticeText: {
    margin: 0,
    color: "#7c3aed",
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },
  aiBadge: { fontSize: '0.8rem', background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '4px 8px', borderRadius: 999, marginLeft: '0.5rem', verticalAlign: 'middle' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  counter: { fontSize: '0.78rem', color: 'var(--text-secondary)' },
  actionBar: { position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.75rem 0', background: 'linear-gradient(180deg, transparent, var(--card-bg))', marginTop: '1rem' },
  categoryCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1rem",
    color: "var(--text-secondary)",
  },
  errorBanner: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10,
    padding: "1rem",
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-start",
  },
  errorIcon: {
    fontSize: "1.25rem",
    flexShrink: 0,
  },
  errorTitle: {
    color: "var(--error)",
    fontSize: "0.95rem",
    fontWeight: 600,
    margin: "0 0 0.25rem",
  },
  errorText: {
    color: "var(--error)",
    fontSize: "0.875rem",
    margin: 0,
    lineHeight: 1.5,
    opacity: 0.8,
  },
};

export default JobForm;
