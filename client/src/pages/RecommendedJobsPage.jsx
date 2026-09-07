import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JobCard from '../components/JobCard';
import api from '../services/api';
import styles from './RecommendedJobsPage.module.css';

const hasScore = (score) => score !== undefined && score !== null;

const SkeletonCard = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonLine} style={{ width: '55%', height: '16px' }} />
    <div className={styles.skeletonLine} style={{ width: '38%', height: '13px' }} />
    <div className={styles.skeletonLine} style={{ width: '45%', height: '13px' }} />
    <div className={styles.skeletonLine} style={{ width: '28%', height: '22px' }} />
  </div>
);

const SkeletonGrid = () => (
  <div className={styles.grid}>
    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

const NoSkillsState = () => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>AI</div>
    <h2 className={styles.emptyTitle}>No skills on your profile yet</h2>
    <p className={styles.emptySub}>
      Extract skills from your bio so we can rank jobs by how well they match you.
    </p>
    <Link to="/profile" className={styles.emptyBtn}>
      Extract skills from bio -&gt;
    </Link>
  </div>
);

const WhyFitBlock = ({ jobId }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(false);

  const fetchWhyFit = async () => {
    setShown(true);
    if (explanation) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/jobs/${jobId}/why-fit`);
      setExplanation(res.data.explanation);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to generate explanation.');
    } finally {
      setLoading(false);
    }
  };

  if (!shown) {
    return (
      <button className={styles.whyFitBtn} onClick={fetchWhyFit}>
        Why this fits →
      </button>
    );
  }

  return (
    <div className={styles.whyFitBox}>
      {loading && <span className={styles.whyFitLoading}>Generating explanation…</span>}
      {!loading && error && <span className={styles.whyFitError}>{error}</span>}
      {!loading && explanation && <p className={styles.whyFitText}>{explanation}</p>}
    </div>
  );
};

const RecommendedJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecommended = async () => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await api.get('/profile');
        const skills = profileRes.data.user?.skills || [];
        if (skills.length === 0) {
          setError('NO_SKILLS');
          return;
        }
        const res = await api.get('/jobs/recommended');
        const sorted = [...(res.data.jobs || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
        setJobs(sorted);
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.message?.includes('skills')) {
          setError('NO_SKILLS');
        } else {
          setError('Unable to load recommendations. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRecommended();
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.breadcrumbLink}>Home</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link to="/jobs" className={styles.breadcrumbLink}>Jobs</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>Recommended</span>
        </div>
        <div className={styles.headerTop}>
          <span className={styles.aiBadge}>AI match</span>
          <h1 className={styles.pageTitle}>Recommended for you</h1>
        </div>
        <p className={styles.pageSub}>
          Jobs ranked by AI similarity score - highest match first
        </p>
      </div>

      <div className={styles.content}>
        {loading && <SkeletonGrid />}
        {!loading && error === 'NO_SKILLS' && <NoSkillsState />}
        {!loading && error && error !== 'NO_SKILLS' && (
          <p className={styles.errorText}>{error}</p>
        )}
        {!loading && !error && jobs.length === 0 && (
          <p className={styles.emptyText}>No jobs match your skills right now.</p>
        )}
        {!loading && !error && jobs.length > 0 && (
          <>
            <div className={styles.resultsBar}>
              <span className={styles.resultsCount}>{jobs.length} matched jobs</span>
            </div>
            <div className={styles.jobList}>
              {jobs.map((job, index) => (
                <div key={job._id} className={styles.jobRow}>
                  <span className={`${styles.rank} ${index < 3 ? styles.rankTop : ''}`}>
                    {index + 1}
                  </span>
                  <div className={styles.cardWrapper}>
                    <JobCard job={job} />
                  </div>
                  {hasScore(job.score) && (
                    <div className={styles.scoreBlock}>
                      <span className={`${styles.scoreNum} ${
                        job.score >= 0.5 ? styles.scoreHigh :
                        job.score >= 0.12 ? styles.scoreMid : styles.scoreLow
                      }`}>
                        {Math.round(job.score * 100)}%
                      </span>
                      <div className={styles.scoreBar}>
                        <div
                          className={`${styles.scoreFill} ${
                            job.score >= 0.5 ? styles.fillHigh :
                            job.score >= 0.12 ? styles.fillMid : styles.fillLow
                          }`}
                          style={{ width: `${Math.round(job.score * 100)}%` }}
                        />
                      </div>
                      <span className={styles.scoreLabel}>match score</span>
                      <WhyFitBlock jobId={job._id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


export default RecommendedJobsPage;