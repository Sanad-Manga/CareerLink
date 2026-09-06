import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import PendingApprovalBanner from "../components/PendingApprovalBanner";

const statusColors = {
  open:   { bg: "#D1FAE5", color: "#065F46" },
  closed: { bg: "#F3F4F6", color: "#6B7280" },
};

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isPending = user?.status === "pending";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pending recruiters skip the fetch; clear the initial loading flag so the banner renders
    if (isPending) { setLoading(false); return; }
    const fetchMyJobs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/jobs/my-jobs");
        setJobs(res.data.jobs || res.data.data || res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your job posts");
      } finally {
        setLoading(false);
      }
    };
    fetchMyJobs();
  }, [isPending]);

  if (loading) return <Spinner />;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Recruiter Dashboard</h1>
          <p style={s.subtitle}>Manage your job postings and review applicants</p>
        </div>
        {!isPending && (
          <Link to="/recruiter/jobs/create" style={s.createBtn}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.45)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            + Create Job
          </Link>
        )}
      </div>

      {isPending && <PendingApprovalBanner />}

      {error && <div style={s.error}>{error}</div>}

      {!isPending && !error && jobs.length === 0 && (
        <div style={s.empty}>You haven't posted any jobs yet.</div>
      )}

      {!isPending && jobs.length > 0 && (
        <div style={s.grid}>
          {jobs.map((job) => (
            <div key={job._id} style={s.card}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={s.cardTop}>
                <h3 style={s.jobTitle}>{job.title}</h3>
                <span style={{ ...s.statusBadge, background: statusColors[job.status]?.bg || "#F3F4F6", color: statusColors[job.status]?.color || "#6B7280" }}>
                  {job.status}
                </span>
              </div>

              <p style={s.jobType}>{job.type}</p>

              <div style={s.applicantRow}>
                <span style={s.applicantCount}>{job.applicantCount ?? job.totalApplicants ?? 0}</span>
                <span style={s.applicantLabel}>
                  applicant{(job.applicantCount ?? job.totalApplicants ?? 0) === 1 ? "" : "s"}
                </span>
              </div>

              <div style={s.actions}>
                <Link to={`/recruiter/applicants/${job._id}`} style={{ ...s.btn, ...s.btnGreen }}>
                  Applicants
                </Link>
                <Link to={`/recruiter/jobs/${job._id}/edit`} style={{ ...s.btn, ...s.btnBlue }}>
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const s = {
  page: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.03em",
    margin: 0,
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    marginTop: "4px",
    margin: 0,
  },
  createBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.65rem 1.5rem",
    background: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: "0.95rem",
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    minHeight: "44px",
  },
  error: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid #EF4444",
    color: "var(--error)",
    padding: "14px 18px",
    borderRadius: 10,
    marginBottom: "1.5rem",
    fontSize: "14px",
  },
  empty: {
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "48px",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  jobTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
    lineHeight: 1.3,
  },
  statusBadge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    textTransform: "capitalize",
    flexShrink: 0,
  },
  jobType: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    textTransform: "capitalize",
    margin: 0,
  },
  applicantRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    borderTop: "1px solid var(--surface)",
    paddingTop: "0.75rem",
    marginTop: "0.25rem",
  },
  applicantCount: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#2563EB",
    lineHeight: 1,
  },
  applicantLabel: {
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  actions: {
    display: "flex",
    gap: "0.625rem",
    marginTop: "0.5rem",
  },
  btn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.55rem 0.75rem",
    borderRadius: 8,
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
  },
  btnGreen: {
    background: "#D1FAE5",
    color: "#065F46",
  },
  btnBlue: {
    background: "#EFF6FF",
    color: "#1D4ED8",
  },
};

export default RecruiterDashboard;
