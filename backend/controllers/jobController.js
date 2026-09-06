const JobPost = require('../models/JobPost');
const Application = require('../models/Application');
const User = require('../models/User');
const { classifyJobCategory } = require('../services/classificationService');
const hf = require('../services/hfService');
// ─── GET /api/v1/jobs ─────────────────────────────────────────────────────────
const getJobEmbedding = async (title, requirements) => {
  try {
    const text = `${title} ${requirements.join(' ')}`;
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      provider: 'hf-inference',
      inputs: text,
    });
    if (!Array.isArray(result) || typeof result[0] !== 'number') {
      console.error('[getJobEmbedding] Unexpected embedding shape:', JSON.stringify(result).slice(0, 100));
      return null;
    }
    return result;
  } catch (err) {
    console.error('[getJobEmbedding] HF call failed:', err.message);
    return null;
  }
};


const getJobs = async (req, res, next) => {
  try {
    const { keyword, location, type, status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (keyword) filter.$or = [
      { title:       { $regex: keyword, $options: 'i' } },
      { company:     { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (type)     filter.type     = type;
    if (status)   filter.status   = status;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await JobPost.countDocuments(filter);
    const jobs  = await JobPost.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });

    res.status(200).json({ success: true, total, page: Number(page), jobs });
  } catch (err) { next(err); }
};

// ─── GET /api/v1/jobs/my-jobs ─────────────────────────────────────────────────
const getMyJobs = async (req, res, next) => {
  try {
    const jobs = await JobPost.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    // Attach applicant counts for each job so the frontend can display them
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ job: job._id });
        const obj = job.toObject ? job.toObject() : job;
        obj.applicantCount = count;
        return obj;
      })
    );

    res.status(200).json({ success: true, jobs: jobsWithCounts });
  } catch (err) { next(err); }
};

// ─── GET /api/v1/jobs/:id ─────────────────────────────────────────────────────
const getJobById = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await JobPost.findById(req.params.id).populate('createdBy', 'name email');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.status(200).json({ success: true, job });
  } catch (err) { next(err); }
};

// ─── POST /api/v1/jobs ────────────────────────────────────────────────────────
const createJob = async (req, res, next) => {
  try {
    if (req.user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Wait for admin approval before posting jobs.',
      });
    }

    const { title, company, description, requirements, location, type } = req.body;
    if (!title || !company || !description || !requirements || !location || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, company, description, requirements, location, type',
      });
    }

    const category = await classifyJobCategory(title, description);
    const embedding = await getJobEmbedding(title, requirements);

    const job = await JobPost.create({ ...req.body, category, embedding, createdBy: req.user._id });
    res.status(201).json({ success: true, job });
  } catch (err) { next(err); }
};

// ─── PATCH /api/v1/jobs/:id ───────────────────────────────────────────────────
const updateJob = async (req, res, next) => {
  try {
    if (req.user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Wait for admin approval before managing jobs.',
      });
    }

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorised to edit this job' });

    if (req.body.description || req.body.title) {
      req.body.category = await classifyJobCategory(req.body.title || job.title, req.body.description || job.description);
    }
    if (req.body.title || req.body.requirements) {
      req.body.embedding = await getJobEmbedding(req.body.title || job.title, req.body.requirements || job.requirements);
    }
    const updated = await JobPost.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, job: updated });
  } catch (err) { next(err); }
};

// ─── DELETE /api/v1/jobs/:id ──────────────────────────────────────────────────
const deleteJob = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const isOwner = job.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: 'Not authorised to delete this job' });

    await job.deleteOne();
    res.status(200).json({ success: true, message: 'Job deleted' });
  } catch (err) { next(err); }
};


// ─── GET /api/v1/jobs/recommended ────────────────────────────────────────────
// Private (jobSeeker only). Returns open jobs ranked by cosine similarity.
const getRecommendedJobs = async (req, res, next) => {
  try {
    const user = req.user;
    const openJobs = await JobPost.find({ status: 'open' }).select('+embedding');

    if (!openJobs.length) return res.status(200).json({ success: true, jobs: [] });

    if (!user.skills.length) {
      const jobs = openJobs.map(job => ({ ...job.toObject(), score: null, scored: false }));
      return res.status(200).json({ success: true, jobs });
    }

    const studentText = user.skills.join(', ');

    try {
        const studentResult = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        provider: 'hf-inference',
        inputs: studentText,
      });
      const studentVec = studentResult;

      const cosineSimilarity = (a, b) => {
        const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dot / (magA * magB);
      };

      // Jobs missing a cached embedding (created before this feature, or a failed embed) get one now
      const missing = openJobs.filter(job => !job.embedding || !job.embedding.length);
      for (const job of missing) {
        const emb = await getJobEmbedding(job.title, job.requirements);
        if (emb) {
          job.embedding = emb;
          await JobPost.findByIdAndUpdate(job._id, { embedding: emb });
        }
      }

      const ranked = openJobs
        .map(job => {
          if (!job.embedding || !job.embedding.length) {
            return { ...job.toObject(), score: null, scored: false };
          }
          const score = cosineSimilarity(studentVec, job.embedding);
          return { ...job.toObject(), score, scored: true };
        })
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

      return res.status(200).json({ success: true, jobs: ranked });
    } catch (hfErr) {
      console.error('[getRecommendedJobs] HF call failed:', hfErr.message);
      const jobs = openJobs.map(job => ({ ...job.toObject(), score: null, scored: false }));
      return res.status(200).json({ success: true, jobs });
    }
  } catch (err) { next(err); }
};

// ─── POST /api/v1/jobs/:id/save ───────────────────────────────────────────────
// SCRUM-37: job seeker toggles save/unsave a job
const saveJob = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Cannot save a closed job' });
    }

    const user = await User.findById(req.user._id).select('+savedJobs');
    const alreadySaved = user.savedJobs.some(id => id.toString() === job._id.toString());

    if (alreadySaved) {
      user.savedJobs = user.savedJobs.filter(id => id.toString() !== job._id.toString());
      await user.save();
      return res.status(200).json({ success: true, message: 'Job removed from saved', saved: false });
    } else {
      user.savedJobs.push(job._id);
      await user.save();
      return res.status(200).json({ success: true, message: 'Job saved', saved: true });
    }
  } catch (err) { next(err); }
};

// ─── GET /api/v1/jobs/saved ───────────────────────────────────────────────────
// SCRUM-50: returns all saved jobs for the logged-in job seeker
const getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+savedJobs');
    const jobs = await JobPost.find({ _id: { $in: user.savedJobs } });
    res.status(200).json({ success: true, jobs });
  } catch (err) { next(err); }
};

// ─── POST /api/v1/jobs/:id/cover-letter ──────────────────────────────────────
const generateCoverLetter = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const user = await User.findById(req.user._id);
    if (!user.bio?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please add a bio to your profile before generating a cover letter.',
      });
    }

    const prompt = `Write a professional cover letter for this job application. Be concise and specific. Write only the cover letter, starting with "Dear Hiring Manager,".

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description}
Requirements: ${job.requirements.join(', ')}

Applicant Background: ${user.bio}`;

        const result = await hf.chatCompletion({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      provider: 'hf-inference',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 450,
      temperature: 0.7,
    });

    const coverLetter = result.choices[0].message.content.trim();
    res.status(200).json({ success: true, coverLetter });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getJobs,
  getMyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getRecommendedJobs,
  saveJob,
  getSavedJobs,
  generateCoverLetter,
};
