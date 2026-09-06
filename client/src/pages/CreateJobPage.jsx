import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CATEGORY_COLORS } from '../utils/categoryColors'
import PendingApprovalBanner from '../components/PendingApprovalBanner'

const JOB_TYPES = ['full-time', 'part-time', 'internship', 'contract']

export default function CreateJobPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({
    title: '', company: '', description: '',
    location: '', type: 'full-time', salary: '', totalSlots: '',
  })
  const [requirements, setRequirements] = useState([''])
  const [errors,       setErrors]       = useState({})
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState('')
  const [createdJob,   setCreatedJob]   = useState(null)

  if (user?.status === 'pending') return <PendingApprovalBanner />

  // ── Validation ──
  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title       = 'Title is required.'
    if (!form.company.trim())     e.company     = 'Company is required.'
    if (!form.description.trim()) e.description = 'Description is required.'
    if (!form.location.trim())    e.location    = 'Location is required.'
    if (!form.type)               e.type        = 'Type is required.'
    if (form.salary && isNaN(Number(form.salary)))
      e.salary = 'Salary must be a number.'
    if (form.totalSlots && (isNaN(Number(form.totalSlots)) || Number(form.totalSlots) < 1))
      e.totalSlots = 'Must be a positive number.'
    if (requirements.filter(r => r.trim()).length === 0)
      e.requirements = 'Add at least one requirement.'
    return e
  }

  const handleChange = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => { const n = { ...er }; delete n[field]; return n })
  }

  // ── Requirements helpers ──
  const updateReq = (i, val) => {
    const next = [...requirements]
    next[i] = val
    setRequirements(next)
    if (errors.requirements) setErrors(er => { const n = { ...er }; delete n.requirements; return n })
  }
  const addReq    = () => setRequirements(r => [...r, ''])
  const removeReq = i  => setRequirements(r => r.filter((_, idx) => idx !== i))

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        title:        form.title.trim(),
        company:      form.company.trim(),
        description:  form.description.trim(),
        location:     form.location.trim(),
        type:         form.type,
        requirements: requirements.filter(r => r.trim()),
      }
      if (form.salary)     payload.salary     = Number(form.salary)
      if (form.totalSlots) payload.totalSlots = Number(form.totalSlots)

      const { data } = await api.post('/jobs', payload)
      setCreatedJob(data.job ?? data.data ?? data)
    } catch (err) {
      let userMessage = err.response?.data?.message || 'Failed to create job. Please try again.'
      
      // Make error messages more helpful
      if (err.response?.status === 403) {
        userMessage = 'Your recruiter account is pending admin approval. You can only post jobs once approved.'
      } else if (err.response?.status === 401) {
        userMessage = 'You must be logged in as a recruiter to post jobs.'
      } else if (err.response?.status === 400) {
        userMessage = 'Please check all required fields are filled in correctly.'
      }
      
      setSubmitError(userMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──
  if (createdJob) {
    const categoryColor = CATEGORY_COLORS[createdJob.category] ?? 'gray'
    return (
      <div style={s.pageWrapper}>
        <div style={s.page}>
          <div style={s.successCard}>
          <div style={s.successIcon}>✓</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.375rem', color: 'var(--text-primary)' }}>
            Job Posted!
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem' }}>
            Your listing is live. The AI assigned a category automatically.
          </p>

          <div style={s.resultJob}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* AI-assigned category — read only */}
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                fontSize: '0.8rem', fontWeight: 600,
                color: categoryColor, border: `1px solid ${categoryColor}`, background: `${categoryColor}18`,
              }}>
                {createdJob.category || 'Other'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: '2px 10px', fontWeight: 500 }}>
                ✨ AI-assigned
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.375rem', color: 'var(--text-primary)' }}>
              {createdJob.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.375rem', fontSize: '0.9rem' }}>
              {createdJob.company} · {createdJob.location}
            </p>
            {createdJob.salary && (
              <p style={{ color: '#166534', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                ${Number(createdJob.salary).toLocaleString()} / yr
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/jobs/${createdJob._id}`)}
              style={s.submitBtn}
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
            >
              View Listing
            </button>
            <button
              onClick={() => {
                setCreatedJob(null)
                setForm({ title: '', company: '', description: '', location: '', type: 'full-time', salary: '', totalSlots: '' })
                setRequirements([''])
              }}
              style={s.cancelBtn}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.97)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              Post Another
            </button>
          </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──
  return (
    <div style={s.pageWrapper}>
    <div style={s.page}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.375rem', color: 'var(--text-primary)' }}>
          Post a New Job
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Fill in the details. The AI will automatically assign a category to your listing.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={s.form} noValidate>

        {/* Title */}
        <div style={s.field}>
          <label style={s.label}>Job Title <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            style={{ ...s.input, ...(errors.title ? s.inputErr : {}) }}
            type="text" placeholder="e.g. Senior Frontend Engineer"
            value={form.title} onChange={handleChange('title')}
          />
          {errors.title && <p style={s.ferr}>{errors.title}</p>}
        </div>

        {/* Company */}
        <div style={s.field}>
          <label style={s.label}>Company <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            style={{ ...s.input, ...(errors.company ? s.inputErr : {}) }}
            type="text" placeholder="e.g. Acme Corp"
            value={form.company} onChange={handleChange('company')}
          />
          {errors.company && <p style={s.ferr}>{errors.company}</p>}
        </div>

        {/* Location + Type */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>Location <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              style={{ ...s.input, ...(errors.location ? s.inputErr : {}) }}
              type="text" placeholder="e.g. Cairo, Egypt"
              value={form.location} onChange={handleChange('location')}
            />
            {errors.location && <p style={s.ferr}>{errors.location}</p>}
          </div>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>Job Type <span style={{ color: '#ef4444' }}>*</span></label>
            <select style={s.input} value={form.type} onChange={handleChange('type')}>
              {JOB_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={s.field}>
          <label style={s.label}>Description <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea
            style={{ ...s.input, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', ...(errors.description ? s.inputErr : {}) }}
            rows={5} placeholder="Describe the role and responsibilities…"
            value={form.description} onChange={handleChange('description')}
          />
          {errors.description && <p style={s.ferr}>{errors.description}</p>}
        </div>

        {/* Requirements — dynamic add/remove */}
        <div style={s.field}>
          <label style={s.label}>Requirements <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {requirements.map((req, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  type="text" placeholder={`Requirement ${i + 1}`}
                  value={req} onChange={e => updateReq(i, e.target.value)}
                />
                {requirements.length > 1 && (
                  <button
                    type="button" onClick={() => removeReq(i)}
                    style={{ width: 32, height: 32, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
          {errors.requirements && <p style={s.ferr}>{errors.requirements}</p>}
          <button
            type="button" onClick={addReq}
            style={{ alignSelf: 'flex-start', marginTop: '0.375rem', padding: '0.45rem 1rem', background: 'rgba(37,99,235,0.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >+ Add Requirement</button>
        </div>

        {/* Salary + Total Slots */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>
              Salary (USD/yr) <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af' }}>optional</span>
            </label>
            <input
              style={{ ...s.input, ...(errors.salary ? s.inputErr : {}) }}
              type="number" min={0} placeholder="e.g. 60000"
              value={form.salary} onChange={handleChange('salary')}
            />
            {errors.salary && <p style={s.ferr}>{errors.salary}</p>}
          </div>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>
              Total Slots <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af' }}>optional</span>
            </label>
            <input
              style={{ ...s.input, ...(errors.totalSlots ? s.inputErr : {}) }}
              type="number" min={1} placeholder="e.g. 3"
              value={form.totalSlots} onChange={handleChange('totalSlots')}
            />
            {errors.totalSlots && <p style={s.ferr}>{errors.totalSlots}</p>}
          </div>
        </div>

        {/* AI notice — no category field */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '1rem' }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>✨</span>
          <p style={{ margin: 0, color: '#7c3aed', fontSize: '0.875rem', lineHeight: 1.5 }}>
            <strong>Category is auto-assigned by AI</strong> — you'll see the result after posting.
          </p>
        </div>

        {submitError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            padding: '1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--error)', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Cannot Post Job</p>
              <p style={{ color: 'var(--error)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5, opacity: 0.8 }}>{submitError}</p>
            </div>
          </div>
        )}

        <div style={s.actionBar}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={s.cancelBtn}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.97)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
          >Cancel</button>
          <button
            type="submit"
            style={s.submitBtn}
            disabled={submitting}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#1d4ed8'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(37,99,235,0.3)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#2563EB'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >{submitting ? 'Posting…' : 'Post Job'}</button>
        </div>
      </form>
    </div>
    </div>
  )
}

const s = {
  pageWrapper: { minHeight: '100vh', width: '100%', background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 28%), linear-gradient(135deg, rgba(37, 99, 235, 0.09), var(--gradient-end))' },
  page: { width: '720px', margin: '0 auto', padding: '2rem 1.5rem 4rem' },
  card: { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', boxShadow: '0 6px 18px rgba(2,6,23,0.06)' },
  heading: { fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.375rem', color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-secondary)', margin: 0 },
  pendingBanner:{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '1.5rem' },
  form:         { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  field:        { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label:        { fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' },
  input:        { padding: '0.65rem 0.875rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-primary)' },
  inputErr:     { borderColor: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  ferr:         { color: '#ef4444', fontSize: '0.8rem', margin: 0 },
  actionBar:    { position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.75rem 0', background: 'linear-gradient(180deg, transparent, var(--card-bg))', marginTop: '1rem' },
  cancelBtn:    { padding: '0.5rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  submitBtn:    { padding: '0.5rem 1.5rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, box-shadow 0.15s, transform 0.15s' },
  successCard:  { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '2.5rem', textAlign: 'center' },
  successIcon:  { width: 56, height: 56, background: '#dcfce7', color: '#166534', borderRadius: '50%', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' },
  resultJob:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' },
}
