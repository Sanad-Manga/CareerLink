// Mock external services before anything else is imported
jest.mock('../services/classificationService', () => ({
  classifyJobCategory: jest.fn().mockResolvedValue('Backend'),
}));

// hfService is the thin @huggingface/inference wrapper. Only the methods the
// controllers actually call are mocked:
//   - featureExtraction  → job recommendations (one embedding vector per input)
//   - zeroShotClassification → real classification path (see classificationService suite)
//   - chatCompletion     → cover-letter generation
jest.mock('../services/hfService', () => {
  const EMBED_DIM = 8;
  return {
    featureExtraction: jest.fn(async ({ inputs }) =>
      // one deterministic vector per input, length always matches the input count
      inputs.map((_, i) =>
        Array.from({ length: EMBED_DIM }, (_, k) => Math.sin((i + 1) * (k + 1)))
      )
    ),
    zeroShotClassification: jest
      .fn()
      .mockResolvedValue([{ label: 'Backend', score: 0.9 }]),
    chatCompletion: jest.fn().mockResolvedValue({
      choices: [
        { message: { content: 'Dear Hiring Manager,\n\nI am a strong fit.\n\nSincerely,\nApplicant' } },
      ],
    }),
  };
});

jest.mock('../services/emailService', () => ({
  sendResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '7d';
process.env.NODE_ENV = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const JobPost = require('../models/JobPost');
const { USERS, JOB } = require('./fixtures');
const { authLimiterStore } = require('../middleware/rateLimiter');
const hfService = require('../services/hfService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await authLimiterStore.resetAll();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const registerUser = (data) =>
  request(app).post('/api/v1/auth/register').send(data);

const loginUser = (email, password) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

async function registerAndLogin(role, suffix = '') {
  const base = USERS[role];
  const email = suffix ? `${base.email.split('@')[0]}${suffix}@test.com` : base.email;

  await registerUser({ ...base, email });

  if (role === 'recruiter') {
    await User.findOneAndUpdate({ email }, { status: 'approved' });
  }

  const res = await loginUser(email, base.password);
  return { token: res.body.token, userId: res.body.user?._id, email };
}

// Admin can't self-register — create the document directly, then log in.
async function createAdminAndLogin(suffix = '') {
  const email = `admin${suffix}@test.com`;
  const password = 'password123';
  await User.create({ name: 'Admin User', email, password, role: 'admin', status: 'approved' });
  const res = await loginUser(email, password);
  return { token: res.body.token, userId: res.body.user?._id, email };
}

async function createTestJob(recruiterToken, overrides = {}) {
  return request(app)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${recruiterToken}`)
    .send({ ...JOB, ...overrides });
}

// ─── Register ────────────────────────────────────────────────────────────────

describe('Auth — Register', () => {
  it('registers a jobSeeker and returns 201 with a token', async () => {
    const res = await registerUser(USERS.jobSeeker);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('jobSeeker');
    expect(res.body.user.status).toBe('approved');
  });

  it('registers a recruiter with pending status', async () => {
    const res = await registerUser(USERS.recruiter);

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('recruiter');
    expect(res.body.user.status).toBe('pending');
  });

  it('blocks admin role from self-registration with 400', async () => {
    const res = await registerUser({
      name: 'Admin User',
      email: 'admin@test.com',
      password: USERS.jobSeeker.password,
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a duplicate email with 400', async () => {
    await registerUser(USERS.jobSeeker);
    const res = await registerUser(USERS.jobSeeker);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email already in use/i);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('Auth — Login', () => {
  beforeEach(async () => {
    await registerUser(USERS.jobSeeker);
  });

  it('returns 200 and a JWT for valid credentials', async () => {
    const { email, password } = USERS.jobSeeker;
    const res = await loginUser(email, password);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
  });

  it('returns 401 for a wrong password', async () => {
    const res = await loginUser(USERS.jobSeeker.email, 'wrongpassword');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for an unknown email', async () => {
    const res = await loginUser('nobody@test.com', USERS.jobSeeker.password);

    expect(res.status).toBe(401);
  });
});

// ─── Create Job with AI Category ─────────────────────────────────────────────

describe('Jobs — Create with AI category', () => {
  it('creates a job and assigns the mocked AI category', async () => {
    const { token } = await registerAndLogin('recruiter');

    const res = await createTestJob(token);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.job.title).toBe('Node.js Backend Developer');
    expect(res.body.job.category).toBe('Backend'); // classifyJobCategory is mocked
  });

  it('returns 403 when recruiter account is still pending', async () => {
    const pendingEmail = 'pending@test.com';
    await registerUser({ ...USERS.recruiter, email: pendingEmail });
    const loginRes = await loginUser(pendingEmail, USERS.recruiter.password);

    const res = await createTestJob(loginRes.body.token);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/pending approval/i);
  });
});

// ─── Classification service — real path (hfService mocked, not the service) ──

describe('classificationService.classifyJobCategory — real mapping', () => {
  // Un-mock the service itself; it still talks to the mocked hfService wrapper.
  const { classifyJobCategory } = jest.requireActual('../services/classificationService');

  it('returns the label from the HF zero-shot response', async () => {
    hfService.zeroShotClassification.mockResolvedValueOnce([{ label: 'AI/ML', score: 0.87 }]);

    const category = await classifyJobCategory('ML Engineer', 'Train PyTorch models, deploy inference');

    expect(category).toBe('AI/ML');
    expect(hfService.zeroShotClassification).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'facebook/bart-large-mnli',
        inputs: expect.stringContaining('ML Engineer'),
      })
    );
  });

  it('handles the { labels: [...] } response shape', async () => {
    hfService.zeroShotClassification.mockResolvedValueOnce([{ labels: ['DevOps'], scores: [0.7] }]);

    const category = await classifyJobCategory('SRE', 'Kubernetes, Terraform, CI/CD');

    expect(category).toBe('DevOps');
  });

  it('falls back to "Other" when the HF call throws', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    hfService.zeroShotClassification.mockRejectedValueOnce(new Error('HF unavailable'));

    const category = await classifyJobCategory('Anything', 'anything at all');

    expect(category).toBe('Other');
    errSpy.mockRestore();
  });
});

// ─── Apply to Job ─────────────────────────────────────────────────────────────

describe('Applications — Apply to job', () => {
  let seekerToken, jobId;

  beforeEach(async () => {
    const { token: rToken } = await registerAndLogin('recruiter', '1');
    const { token: sToken } = await registerAndLogin('jobSeeker', '1');
    seekerToken = sToken;

    const jobRes = await createTestJob(rToken);
    jobId = jobRes.body.job._id;
  });

  it('submits an application and returns 201', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${jobId}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ coverLetter: 'I am very interested in this position.' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Application submitted');
    expect(res.body.application.status).toBe('pending');
  });

  it('rejects a duplicate application with 400', async () => {
    await request(app)
      .post(`/api/v1/applications/${jobId}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ coverLetter: 'First application.' });

    const res = await request(app)
      .post(`/api/v1/applications/${jobId}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ coverLetter: 'Trying again.' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already applied/i);
  });

  it('returns 404 for a non-existent job', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/v1/applications/${fakeId}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({});

    expect(res.status).toBe(404);
  });
});

// ─── Application status updates ──────────────────────────────────────────────

describe('Applications — Update status (PATCH /applications/:id/status)', () => {
  let ownerToken, otherRecruiterToken, seekerToken, applicationId;

  beforeEach(async () => {
    const { token: rToken } = await registerAndLogin('recruiter', 'own');
    const { token: r2Token } = await registerAndLogin('recruiter', 'other');
    const { token: sToken } = await registerAndLogin('jobSeeker', 'app');
    ownerToken = rToken;
    otherRecruiterToken = r2Token;
    seekerToken = sToken;

    const jobRes = await createTestJob(ownerToken);
    const applyRes = await request(app)
      .post(`/api/v1/applications/${jobRes.body.job._id}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ coverLetter: 'Please consider me.' });
    applicationId = applyRes.body.application._id;
  });

  it('lets the owning recruiter move an application to shortlisted (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'shortlisted' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('shortlisted');
  });

  it('rejects an invalid status value with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'hired' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid status/i);
  });

  it('returns 403 when a different recruiter tries to update it', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${otherRecruiterToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(403);
  });

  it('returns 403 for a job seeker (wrong role)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ status: 'shortlisted' });

    expect(res.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .send({ status: 'shortlisted' });

    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent application', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/v1/applications/${fakeId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'shortlisted' });

    expect(res.status).toBe(404);
  });
});

// ─── Job recommendations ────────────────────────────────────────────────────

describe('Jobs — Recommendations (GET /jobs/recommended)', () => {
  let seekerToken, seekerId, recruiterToken;

  beforeEach(async () => {
    const { token: rToken } = await registerAndLogin('recruiter', 'rec');
    const { token: sToken, userId } = await registerAndLogin('jobSeeker', 'rec');
    recruiterToken = rToken;
    seekerToken = sToken;
    seekerId = userId;

    await createTestJob(rToken, { title: 'Senior Node.js Engineer' });
    await createTestJob(rToken, { title: 'Frontend React Developer', requirements: ['React', 'CSS'] });
  });

  it('returns ranked jobs with normalised scores for a seeker with skills (200)', async () => {
    await User.findByIdAndUpdate(seekerId, { skills: ['Node.js', 'Express', 'MongoDB'] });

    const res = await request(app)
      .get('/api/v1/jobs/recommended')
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.jobs)).toBe(true);
    expect(res.body.jobs).toHaveLength(2);
    expect(hfService.featureExtraction).toHaveBeenCalled();
    // scores are normalised so the top match is 1.0 and the list is sorted desc
    expect(res.body.jobs[0].score).toBeCloseTo(1, 5);
    expect(res.body.jobs[0].score).toBeGreaterThanOrEqual(res.body.jobs[1].score);
  });

  it('returns jobs unranked (no HF call) when the seeker has no skills (200)', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/recommended')
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(2);
    expect(res.body.jobs[0].score).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/jobs/recommended');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a recruiter (wrong role)', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/recommended')
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Cover letter generation ────────────────────────────────────────────────

describe('Jobs — Cover letter (POST /jobs/:id/cover-letter)', () => {
  let seekerToken, seekerId, recruiterToken, jobId;

  beforeEach(async () => {
    const { token: rToken } = await registerAndLogin('recruiter', 'cl');
    const { token: sToken, userId } = await registerAndLogin('jobSeeker', 'cl');
    recruiterToken = rToken;
    seekerToken = sToken;
    seekerId = userId;

    const jobRes = await createTestJob(rToken);
    jobId = jobRes.body.job._id;
  });

  it('generates a cover letter from the mocked chat model (200)', async () => {
    await User.findByIdAndUpdate(seekerId, { bio: 'Backend developer with 3 years of Node.js experience.' });

    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/cover-letter`)
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.coverLetter).toMatch(/Dear Hiring Manager,/);
    expect(hfService.chatCompletion).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when the seeker has no bio', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/cover-letter`)
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/add a bio/i);
  });

  it('returns 404 for a non-existent job', async () => {
    await User.findByIdAndUpdate(seekerId, { bio: 'Has a bio.' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/v1/jobs/${fakeId}/cover-letter`)
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(`/api/v1/jobs/${jobId}/cover-letter`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a recruiter (wrong role)', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/cover-letter`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Saved jobs ─────────────────────────────────────────────────────────────

describe('Jobs — Save / unsave (POST /jobs/:id/save, GET /jobs/saved)', () => {
  let seekerToken, recruiterToken, jobId;

  beforeEach(async () => {
    const { token: rToken } = await registerAndLogin('recruiter', 'save');
    const { token: sToken } = await registerAndLogin('jobSeeker', 'save');
    recruiterToken = rToken;
    seekerToken = sToken;

    const jobRes = await createTestJob(rToken);
    jobId = jobRes.body.job._id;
  });

  it('toggles a job into and out of the saved list', async () => {
    const saveRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/save`)
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.saved).toBe(true);

    const listRes = await request(app)
      .get('/api/v1/jobs/saved')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.jobs).toHaveLength(1);
    expect(listRes.body.jobs[0]._id).toBe(jobId);

    const unsaveRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/save`)
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(unsaveRes.status).toBe(200);
    expect(unsaveRes.body.saved).toBe(false);

    const emptyRes = await request(app)
      .get('/api/v1/jobs/saved')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(emptyRes.body.jobs).toHaveLength(0);
  });

  it('returns 400 when trying to save a closed job', async () => {
    await JobPost.findByIdAndUpdate(jobId, { status: 'closed' });

    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/save`)
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/closed job/i);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(`/api/v1/jobs/${jobId}/save`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a recruiter (wrong role)', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/save`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Admin stats ────────────────────────────────────────────────────────────

describe('Admin — Stats (GET /admin/stats)', () => {
  it('returns aggregated platform stats for an admin (200)', async () => {
    const { token: adminToken } = await createAdminAndLogin('stats');
    const { token: rToken } = await registerAndLogin('recruiter', 'stats');
    const { token: sToken } = await registerAndLogin('jobSeeker', 'stats');

    const jobRes = await createTestJob(rToken);
    await request(app)
      .post(`/api/v1/applications/${jobRes.body.job._id}/apply`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ coverLetter: 'x' });

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toEqual(
      expect.objectContaining({
        usersByRole: expect.objectContaining({ jobSeeker: 1, recruiter: 1 }),
        jobsByStatus: expect.objectContaining({ open: 1, closed: 0 }),
        appsByStatus: expect.objectContaining({ pending: 1, shortlisted: 0, rejected: 0 }),
        topJobs: expect.any(Array),
      })
    );
  });

  it('returns 403 for a job seeker (wrong role)', async () => {
    const { token } = await registerAndLogin('jobSeeker', 'stats2');
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });
});

// ─── Profile — Extract Skills (keyword matching, not an NER model) ───────────

describe('Profile — Extract Skills (keyword matcher)', () => {
  it('pulls known tech keywords out of the bio and saves them', async () => {
    const { token, userId } = await registerAndLogin('jobSeeker', '2');
    await User.findByIdAndUpdate(userId, { bio: 'JavaScript and Node.js developer, some MongoDB' });

    const res = await request(app)
      .post('/api/v1/profile/extract-skills')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.skills).toEqual(expect.arrayContaining(['JavaScript', 'Node.js', 'MongoDB']));

    const updated = await User.findById(userId);
    expect(updated.skills).toEqual(expect.arrayContaining(['JavaScript', 'Node.js', 'MongoDB']));
  });

  it('returns 400 when bio is empty', async () => {
    const { token } = await registerAndLogin('jobSeeker', '3');

    const res = await request(app)
      .post('/api/v1/profile/extract-skills')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/bio is empty/i);
  });

  it('returns 403 for a recruiter (wrong role)', async () => {
    const { token } = await registerAndLogin('recruiter', 'skills');
    const res = await request(app)
      .post('/api/v1/profile/extract-skills')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── Change password (authenticated) ────────────────────────────────────────

describe('Profile — Change password (PATCH /profile/change-password)', () => {
  let token;
  const email = 'changepw@test.com';
  const oldPassword = 'password123';

  beforeEach(async () => {
    await registerUser({ ...USERS.jobSeeker, email });
    const res = await loginUser(email, oldPassword);
    token = res.body.token;
  });

  it('changes the password and lets the user log in with the new one', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword, newPassword: 'brandNew123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const oldLogin = await loginUser(email, oldPassword);
    expect(oldLogin.status).toBe(401);

    const newLogin = await loginUser(email, 'brandNew123');
    expect(newLogin.status).toBe(200);
  });

  it('returns 400 when a field is missing', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the new password is too short', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword, newPassword: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/between 6 and 30/i);
  });

  it('returns 401 when the current password is wrong', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'notmypassword', newPassword: 'brandNew123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/current password is incorrect/i);
  });

  it('returns 400 when the new password equals the current one', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword, newPassword: oldPassword });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be the same/i);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/change-password')
      .send({ currentPassword: oldPassword, newPassword: 'brandNew123' });

    expect(res.status).toBe(401);
  });
});

// ─── OTP / Forgot Password ───────────────────────────────────────────────────

describe('Auth — OTP / Forgot Password', () => {
  const sendOtpEmail = require('../services/emailService').sendOtpEmail;

  beforeEach(async () => {
    await registerUser(USERS.jobSeeker);
  });

  it('returns 200 for both known and unknown emails (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('sends OTP email for a known account', async () => {
    sendOtpEmail.mockClear();

    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: USERS.jobSeeker.email });

    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledWith(
      USERS.jobSeeker.email,
      expect.stringMatching(/^\d{6}$/)
    );
  });

  it('returns 400 for a wrong OTP', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: USERS.jobSeeker.email });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: USERS.jobSeeker.email, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  it('returns resetToken when OTP is correct', async () => {
    sendOtpEmail.mockClear();

    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: USERS.jobSeeker.email });

    const sentOtp = sendOtpEmail.mock.calls[0][1];

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: USERS.jobSeeker.email, otp: sentOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.resetToken).toBeDefined();
  });
});

// ─── Full reset-password flow ───────────────────────────────────────────────

describe('Auth — Full reset-password flow', () => {
  const sendOtpEmail = require('../services/emailService').sendOtpEmail;
  const email = 'resetflow@test.com';
  const originalPassword = 'password123';

  beforeEach(async () => {
    await registerUser({ ...USERS.jobSeeker, email });
  });

  async function getResetToken() {
    sendOtpEmail.mockClear();
    await request(app).post('/api/v1/auth/forgot-password').send({ email });
    const otp = sendOtpEmail.mock.calls.at(-1)[1];
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email, otp });
    return verifyRes.body.resetToken;
  }

  it('forgot → verify-otp → reset-password → login with the new password', async () => {
    const resetToken = await getResetToken();

    const validateRes = await request(app).get(
      `/api/v1/auth/validate-reset-token/${resetToken}`
    );
    expect(validateRes.status).toBe(200);

    const resetRes = await request(app)
      .patch(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: 'freshPass456' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.token).toBeDefined();

    expect((await loginUser(email, originalPassword)).status).toBe(401);
    expect((await loginUser(email, 'freshPass456')).status).toBe(200);
  });

  it('rejects an invalid reset token with 400', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/reset-password/deadbeefdeadbeef')
      .send({ password: 'whatever123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  it('rejects reusing the current password with 400', async () => {
    const resetToken = await getResetToken();

    const res = await request(app)
      .patch(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: originalPassword });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/same as your current password/i);
  });

  it('rejects reusing a password from the last-5 history with 400', async () => {
    // change away from the original, then try to go back to it
    let resetToken = await getResetToken();
    await request(app)
      .patch(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: 'intermediate789' });

    resetToken = await getResetToken();
    const res = await request(app)
      .patch(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: originalPassword });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/last 5 passwords/i);
  });

  it('rejects a too-short new password with 400', async () => {
    const resetToken = await getResetToken();

    const res = await request(app)
      .patch(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 6 characters/i);
  });

  it('validate-reset-token returns 400 for a bogus token', async () => {
    const res = await request(app).get(
      '/api/v1/auth/validate-reset-token/not-a-real-token'
    );
    expect(res.status).toBe(400);
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe('Auth — Rate Limiting', () => {
  it('returns 429 after exceeding 10 auth requests from the same IP', async () => {
    for (let i = 0; i < 10; i++) {
      await registerUser({ ...USERS.jobSeeker, email: `flood${i}@test.com` });
    }

    const res = await registerUser({ ...USERS.jobSeeker, email: 'flood10@test.com' });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/too many attempts/i);
  });
});
