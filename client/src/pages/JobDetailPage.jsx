import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import SaveJobButton from '../components/SaveJobButton'
import ApplicationStatusBadge from '../components/ApplicationStatusBadge'
import Spinner from '../components/Spinner'

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [job,            setJob]           = useState(null)
  const [loading,        setLoading]       = useState(true)
  const [error,          setError]         = useState('')
  const [errorType,      setErrorType]     = useState(null) // 'auth'|'forbidden'|null
  const [modalOpen,      setModalOpen]     = useState(false)
  const [authModalOpen,  setAuthModalOpen] = useState(false)
  const [authMessage,    setAuthMessage]   = useState('')
  const [toast,          setToast]         = useState(null)
  const [coverLetter,    setCoverLetter]   = useState('')
  const [clLoading,      setClLoading]     = useState(false)
  const [clDraft,        setClDraft]       = useState('')
  const [clError,        setClError]       = useState('')
  const [applying,       setApplying]      = useState(false)
  const [applyError,     setApplyError]    = useState('')
  const [myApplication,  setMyApplication] = useState(null)

  const isJobSeeker = isAuthenticated && user?.role === 'jobSeeker'
  const showJobSeekerActions = isJobSeeker

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/jobs/${id}`)
        const jobData = data.job ?? data.data ?? data
        setJob(jobData)

        // Check if current user already applied
        if (isJobSeeker) {
          try {
            const { data: appData } = await api.get('/applications/my')
            const apps = appData.applications ?? appData.data ?? appData
            const existing = apps.find(a => (a.job?._id ?? a.job) === id)
            if (existing) setMyApplication(existing)
          } catch { /* not critical */ }
        }
      } catch (err) {
          const status = err.response?.status
          if (status === 401) {
            navigate('/login', { replace: true })
            return
          } else if (status === 403) {
            setError('You do not have permission to view this job.')
            setErrorType('forbidden')
          } else {
            setError(err.response?.data?.message || 'Could not load this job.')
            setErrorType(null)
          }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isJobSeeker])

  const handleApply = async () => {
    setApplying(true)
    setApplyError('')
    try {
      const body = {}
      if (coverLetter.trim()) body.coverLetter = coverLetter.trim()
      const { data } = await api.post(`/jobs/${id}/apply`, body)
      setMyApplication(data.application ?? data.data ?? data)
      setModalOpen(false)
      setCoverLetter('')
      setToast({ type: 'success', message: 'Application submitted successfully!' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      const message = err.response?.data?.message || 'Application failed. Please try again.'
      
      // Make error messages more user-friendly
      let userMessage = message
      if (message.includes('already applied')) {
        userMessage = 'You have already applied to this job. Check your applications for status updates.'
      } else if (message.includes('no longer accepting')) {
        userMessage = 'This job is no longer accepting applications.'
      } else if (err.response?.status === 401) {
        userMessage = 'You must be logged in to apply. Please log in and try again.'
      } else if (err.response?.status === 403) {
        userMessage = 'Only job seekers can apply. Your account type does not have this permission.'
      }
      
      setApplyError(userMessage)
    } finally {
      setApplying(false)
    }
  }

  const handleApplyClick = () => {
    if (myApplication) {
      setToast({ type: 'info', message: 'You already applied to this job' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (job.status !== 'open') {
      setToast({ type: 'warning', message: 'This job is no longer accepting applications' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (!isAuthenticated) {
      setAuthMessage('Log In to Apply')
      setAuthModalOpen(true)
      return
    }

    if (!isJobSeeker) {
      setAuthMessage('Only Job Seekers Can Apply')
      setAuthModalOpen(true)
      return
    }

    // User is authenticated and is a job seeker
    setModalOpen(true)
  }

  const handleGenerateCoverLetter = async () => {
    setClLoading(true)
    setClError('')
    setClDraft('')
    try {
      const { data } = await api.post(`/jobs/${id}/cover-letter`)
      setClDraft(data.coverLetter)
    } catch (err) {
      setClError(err.response?.data?.message || 'Failed to generate cover letter. Try again.')
    } finally {
      setClLoading(false)
    }
  }

  if (loading) return <Spinner />

  if (error) return (
    <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>
      {errorType === 'auth' ? (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ padding: '0.6rem 1.25rem', background: '#2563EB', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Log In</button>
          <button onClick={() => navigate('/register')} style={{ padding: '0.6rem 1.25rem', background: '#f3f4f6', color: '#111827', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }}>Create Account</button>
        </div>
      ) : errorType === 'forbidden' ? (
        <div>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>If you believe this is an error, contact your administrator.</p>
          <button onClick={() => navigate('/jobs')} style={{ padding: '0.5rem 1.25rem', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← Back to Jobs</button>
        </div>
      ) : (
        <button onClick={() => navigate('/jobs')} style={{ padding: '0.5rem 1.25rem', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← Back to Jobs</button>
      )}
    </div>
  )

  if (!job) return null

  const recruiter     = job.createdBy ?? job.recruiter ?? job.postedBy ?? null
  const recruiterStatus = recruiter?.status
  const recruiterApproved = recruiterStatus ? recruiterStatus === 'approved' : true

  return (
    <div style={s.pageWrapper}>
      <div style={s.page}>
        <button onClick={() => navigate(-1)} style={s.backLink} className="backLink">← Back</button>

        <div style={s.card}>
        {/* ── Header ── */}
        <div style={s.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h1 style={s.jobTitle}>{job.title}</h1>
            {job.type && (
              <span style={{ background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 12 }}>
                {job.type}
              </span>
            )}
          </div>
          <span style={{ ...s.badge, color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: '1rem' }}>
            {job.category || 'Other'}
          </span>
          <p style={s.company}>{job.company}</p>
          
          {/* Meta row with location and status */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {job.location && <span style={s.metaItem}>📍 {job.location}</span>}
            <span style={{
              ...s.metaItem,
              color: job.status === 'open' ? '#166534' : '#991b1b',
              background: job.status === 'open' ? '#dcfce7' : '#fee2e2',
              borderRadius: 12, padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600,
            }}>
              {job.status?.toUpperCase()}
            </span>
          </div>

          {showJobSeekerActions && (
            /* Save & Apply buttons - side by side */
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {recruiterApproved ? (
                  <SaveJobButton jobId={job._id} status={job.status} initialSaved={job.isSaved ?? false} />
                ) : (
                  <button disabled style={{ padding: '0.5rem 0.75rem', background: '#f3f4f6', color: '#9ca3af', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'not-allowed', minWidth: '44px', minHeight: '44px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔖</span>
                  </button>
                )}
                {myApplication ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        backgroundColor: '#f0f9ff',
                        color: '#0c4a6e',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        display: 'inline-block',
                        border: '1px solid rgba(6, 120, 180, 0.15)',
                        boxShadow: '0 2px 6px rgba(6, 120, 180, 0.08)',
                      }}
                    >
                      You applied!
                    </span>
                    <ApplicationStatusBadge status={myApplication.status} />
                  </div>
                ) : (
                  <button 
                    onClick={handleApplyClick}
                    disabled={job.status !== 'open' || !recruiterApproved}
                    style={{ ...s.applyBtn, ...(job.status !== 'open' ? { opacity: 0.6, cursor: 'not-allowed' } : {}), width: 'auto', minHeight: '44px' }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#1d4ed8'
                      e.target.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#2563EB'
                      e.target.style.boxShadow = 'none'
                      e.target.style.transform = 'scale(1)'
                    }}
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recruiter status message when actions are disabled */}
          {showJobSeekerActions && !recruiterApproved && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, color: '#92400e' }}>
              This recruiter's account is {recruiterStatus}. Applying and saving are disabled for listings from unapproved recruiters.
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={s.body}>
          {/* Salary + slots */}
          {(job.salary || job.totalSlots) && (
            <div style={s.highlightRow}>
              {job.salary     && (
                <div style={s.highlightContainer}>
                  <span style={s.hlLabel}>Salary</span>
                  <span style={s.hlValue}>${Number(job.salary).toLocaleString()}</span>
                </div>
              )}
              {job.totalSlots && (
                <div style={s.highlightContainer}>
                  <span style={s.hlLabel}>Open Slots</span>
                  <span style={s.hlValue}>{job.totalSlots}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>About the Role</h2>
            <p style={s.description}>{job.description}</p>
          </section>

          {/* Requirements */}
          {job.requirements?.length > 0 && (
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Requirements</h2>
              <ul style={s.list}>
                {job.requirements.map((req, i) => (
                  <li key={i} style={s.listItem}>• {req}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Recruiter info */}
          {recruiter && (
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Posted by</h2>
              <div style={s.recruiterCard}>
                <div style={s.avatar}>{(recruiter.name || 'R')[0].toUpperCase()}</div>
                <div>
                  {recruiter._id ? (
                    <Link
                      to={`/users/${recruiter._id}`}
                      style={{ fontWeight: 600, color: '#2563EB', margin: 0, textDecoration: 'none', display: 'block' }}
                      onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.target.style.textDecoration = 'none'}
                    >
                      {recruiter.name}
                    </Link>
                  ) : (
                    <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>{recruiter.name}</p>
                  )}
                  {recruiter.email && (
                    <a href={`mailto:${recruiter.email}`} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>
                      {recruiter.email}
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* AI Cover Letter — job seekers only */}
          {isJobSeeker && (
            <section style={s.section}>
              <h2 style={s.sectionTitle}>AI Cover Letter</h2>
              <button
                onClick={handleGenerateCoverLetter}
                disabled={clLoading}
                style={{ padding: '0.65rem 1.25rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', cursor: clLoading ? 'not-allowed' : 'pointer', opacity: clLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {clLoading ? <><Spinner size={16} /> Generating…</> : '✨ Generate Cover Letter Suggestion'}
              </button>

              {clError && (
                <p style={{ color: '#b91c1c', marginTop: '0.75rem', fontSize: '0.875rem' }}>{clError}</p>
              )}

              {clDraft && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Draft — edit before using
                  </label>
                  <textarea
                    value={clDraft}
                    onChange={e => setClDraft(e.target.value)}
                    rows={12}
                    style={{ width: '100%', padding: '0.875rem', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--card-bg)', color: 'var(--text)' }}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(clDraft); setToast({ type: 'success', message: 'Cover letter copied!' }); setTimeout(() => setToast(null), 3000) }}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text)' }}
                  >
                    Copy to clipboard
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* ── Apply Modal ── */}
      {modalOpen && (
        <div style={s.modalOverlay} onClick={() => { setModalOpen(false); setApplyError('') }}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-h)' }}>
              Apply — {job.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>at {job.company}</p>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              Cover Letter <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }}
              rows={6}
              placeholder="Tell the recruiter why you're a great fit…"
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
            />
            {applyError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '0.75rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                marginTop: '0.75rem',
                animation: 'fadeInScale 0.3s ease-out'
              }}>
                <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>{applyError}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => { setModalOpen(false); setApplyError('') }}
                disabled={applying}
                style={{ padding: '0.6rem 1.25rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease' }}
              >Cancel</button>
              <button
                onClick={handleApply}
                disabled={applying}
                style={{ padding: '0.6rem 1.5rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
              >{applying ? 'Submitting…' : 'Submit Application'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Auth Modal (for login/role restrictions) ── */}
      {authModalOpen && (
        <div style={s.modalOverlay} onClick={() => setAuthModalOpen(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-h)' }}>
                {authMessage}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
                {authMessage.includes('Log In') ? 
                  'You need to log in to apply for this job. Create an account or log in with your existing credentials.' :
                  'This action is only available to job seekers. Log in as a job seeker or create a new account.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setAuthModalOpen(false)
                    navigate('/login')
                  }}
                  style={{ padding: '0.7rem 1.5rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setAuthModalOpen(false)
                    navigate('/register')
                  }}
                  style={{ padding: '0.7rem 1.5rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  Create Account
                </button>
                <button
                  onClick={() => setAuthModalOpen(false)}
                  style={{ padding: '0.7rem 1.5rem', background: 'transparent', color: 'var(--text-secondary)', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          padding: '1rem 1.5rem',
          borderRadius: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out',
          background: toast.type === 'success' ? '#dcfce7' : toast.type === 'warning' ? '#fef3c7' : '#e0f2fe',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : toast.type === 'warning' ? '#fde68a' : '#bae6fd'}`,
          color: toast.type === 'success' ? '#166534' : toast.type === 'warning' ? '#92400e' : '#0c4a6e',
          fontWeight: 500,
          fontSize: '0.95rem'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalSlideIn {
          from {
            transform: scale(0.95) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes buttonHover {
          from {
            transform: scale(1);
            box-shadow: none;
          }
          to {
            transform: scale(1.05);
            box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
          }
        }
        @keyframes buttonClick {
          0% {
            transform: scale(1.05);
          }
          50% {
            transform: scale(0.98);
          }
          100% {
            transform: scale(1.05);
          }
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        button {
          transition: all 0.3s ease;
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        button.backLink:hover {
          transform: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
          background: 'rgba(37, 99, 235, 0.12)';
          border-color: rgba(37, 99, 235, 0.25);
        }
        button.backLink:active {
          transform: scale(0.98);
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.1);
        }
        button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
      </div>
    </div>
  )
}

const s = {
  pageWrapper: { minHeight: '100vh', width: '100%', background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 28%), linear-gradient(135deg, rgba(37, 99, 235, 0.09), var(--gradient-end))' },
  page:        { width: '720px', margin: '0 auto', padding: '2rem 1.5rem 4rem', fontFamily: 'sans-serif' },
  backLink:    { background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.15)', color: '#2563EB', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.25rem', padding: '0.5rem 1rem', borderRadius: '8px', transition: 'all 0.2s ease', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
  card:        { background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 28%), linear-gradient(135deg, rgba(37, 99, 235, 0.09), var(--gradient-end))', border: '1px solid rgba(37, 99, 235, 0.12)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' },
  cardHeader:  { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '28px' },
  kicker:      { color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700, margin: 0 },
  badge:       { display: 'inline-flex', width: 'fit-content', margin: '0 0 0.75rem', padding: '6px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)' },
  jobTitle:    { fontSize: 'clamp(1.6rem, 2vw, 2.25rem)', fontWeight: 700, color: 'var(--text-h)', margin: '8px 0 0.375rem', lineHeight: 1.1 },
  company:     { fontSize: '1.125rem', color: 'var(--text-h)', margin: '0.5rem 0 1rem', fontWeight: 600 },
  metaRow:     { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' },
  metaItem:    { fontSize: '0.875rem', color: 'var(--text)' },
  actions:     { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: 160 },
  applyBtn:    { padding: '0.65rem 1.5rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s ease', transform: 'scale(1)', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body:        { padding: '28px', borderTop: '1px solid rgba(37, 99, 235, 0.12)' },
  highlights:  { display: 'flex', gap: '1.5rem', background: 'linear-gradient(180deg, #ffffff, #f8fbff)', borderRadius: '18px', padding: '1rem 1.5rem', marginBottom: '2rem', border: '1px solid rgba(37, 99, 235, 0.08)' },
  highlightRow: { display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem' },
  highlightContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  highlight:   { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  hlLabel:     { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  hlValue:     { fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)' },
  section:     { marginBottom: '2rem' },
  sectionTitle:{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  description: { color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 },
  list:        { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  listItem:    { color: 'var(--text)', lineHeight: 1.6 },
  recruiterCard:{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'linear-gradient(180deg, var(--card-bg), var(--surface))', borderRadius: '18px', padding: '1rem 1.25rem', border: '1px solid rgba(37, 99, 235, 0.1)' },
  avatar:      { width: 44, height: 44, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, animation: 'fadeIn 0.2s ease-out' },
  modalContent: { background: 'var(--card-bg)', borderRadius: 16, padding: '2rem', maxWidth: 500, width: '90%', boxShadow: '0 20px 25px rgba(0,0,0,0.25)', animation: 'modalSlideIn 0.3s ease-out' },
}
