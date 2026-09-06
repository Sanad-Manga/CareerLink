  const Application = require("../models/Application");
const JobPost = require("../models/JobPost");

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

const getJobApplicants = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorised to view these applicants" });
    }

    const applicants = await Application.find({ job: jobId })
      .populate("user", "name email bio skills profilePicture")
      .sort({ appliedAt: -1 });

    return res.status(200).json({ success: true, applications: applicants });
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
