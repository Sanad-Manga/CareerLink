const Application = require("../models/Application");
const JobPost = require("../models/JobPost");
const { cosineSimilarity } = require("../services/similarity");
const { getUserEmbedding } = require("../services/embedding");

const getAllApplications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Application.countDocuments();
    const applications = await Application.find()
      .populate("user", "name email")
      .populate("job", "title company")
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({ success: true, total, page, applications });
  } catch (err) {
    next(err);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ user: req.user._id })
      .populate("job", "title company type status")
      .sort({ appliedAt: -1 });

    return res.status(200).json({ success: true, applications });
  } catch (err) {
    next(err);
  }
};

const applyToJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

        if (job.status !== "open") {
      return res.status(400).json({ success: false, message: "This job is no longer accepting applications" });
    }

    const existing = await Application.findOne({ user: req.user._id, job: jobId });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already applied to this job" });
    }

    const applicantCount = await Application.countDocuments({ job: jobId });
    if (applicantCount >= job.totalSlots) {
      return res.status(400).json({ success: false, message: "This job has reached its applicant limit" });
    }

    const application = await Application.create({
      user: req.user._id,
      job: jobId,
      coverLetter: coverLetter || "",
      status: "pending",
    });

    if (applicantCount + 1 >= job.totalSlots) {
      await JobPost.findByIdAndUpdate(jobId, { status: "closed" });
    }

    return res.status(201).json({ success: true, message: "Application submitted", application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "You have already applied to this job" });
    }
    next(err);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ["pending", "shortlisted", "rejected"];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const application = await Application.findById(id).populate("job");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (!application.job) {
      return res.status(404).json({ success: false, message: "Associated job not found" });
    }

    if (application.job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorised to update this application" });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({ success: true, message: "Status updated", application });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/applications/job/:jobId ─────────────────────────────────────
// Private (owning recruiter only). Returns a job's applicants ranked by
// cosine similarity between the job's cached embedding and each applicant's
// (lazily cached) embedding — mirrors the /jobs/recommended pattern.
const getJobApplicants = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await JobPost.findById(jobId).select("+embedding");
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorised to view these applicants" });
    }

    const applicants = await Application.find({ job: jobId })
      .populate({ path: "user", select: "name email bio skills profilePicture embedding", options: { select: "+embedding" } })
      .sort({ appliedAt: -1 });

    // No job embedding cached (e.g. HF failed at creation time) → can't score anyone
    if (!job.embedding || !job.embedding.length) {
      const unscored = applicants.map(a => ({ ...a.toObject(), score: null, scored: false }));
      return res.status(200).json({ success: true, applications: unscored });
    }

    const ranked = await Promise.all(
      applicants.map(async (application) => {
        const applicant = application.user;
        const obj = application.toObject();

        if (!applicant) return { ...obj, score: null, scored: false };

        let embedding = applicant.embedding;

        // Lazy backfill: applicant has no cached embedding yet (pre-dates #8,
        // or their skills/bio were set before the embedding hook existed).
        if (!embedding || !embedding.length) {
          embedding = await getUserEmbedding(applicant.skills, applicant.bio);
          if (embedding) {
            await applicant.constructor.findByIdAndUpdate(applicant._id, { embedding });
          }
        }

        if (!embedding || !embedding.length) {
          return { ...obj, score: null, scored: false };
        }

        const score = cosineSimilarity(job.embedding, embedding);
        return { ...obj, score, scored: true };
      })
    );

    ranked.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    return res.status(200).json({ success: true, applications: ranked });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllApplications,
  getMyApplications,
  applyToJob,
  updateApplicationStatus,
  getJobApplicants,
};