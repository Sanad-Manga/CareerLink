const express = require('express');
const router  = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
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
} = require('../controllers/jobController');

const { getJobApplicants, applyToJob } = require("../controllers/applicationController");

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job posting and application endpoints
 */

/**
 * @swagger
 * /jobs/my-jobs:
 *   get:
 *     summary: Get all jobs created by the logged-in recruiter
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter's job posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobPost'
 *       403:
 *         description: Recruiters only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/my-jobs', protect, authorize('recruiter'), getMyJobs);

/**
 * @swagger
 * /jobs/recommended:
 *   get:
 *     summary: Get AI-ranked job recommendations for the logged-in job seeker
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns jobs ranked by cosine similarity between the user's skills and job
 *       requirements, computed via HuggingFace sentence embeddings
 *       (sentence-transformers/all-MiniLM-L6-v2).
 *     responses:
 *       200:
 *         description: Ranked list of recommended jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobs:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/JobPost'
 *                       - type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                             example: 0.87
 *       403:
 *         description: Job seekers only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recommended', protect, authorize('jobSeeker'), aiLimiter, getRecommendedJobs);

/**
 * @swagger
 * /jobs/saved:
 *   get:
 *     summary: Get all saved/bookmarked jobs for the logged-in job seeker
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobPost'
 *       403:
 *         description: Job seekers only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/saved', protect, authorize('jobSeeker'), getSavedJobs);

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: Get all jobs (public, paginated, filterable)
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, internship]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of job postings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobPost'
 */

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job post (Recruiter only — must be approved)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     description: AI model automatically classifies the job category before saving.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, company, description, requirements, location, type]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Backend Intern
 *               company:
 *                 type: string
 *                 example: TechCo
 *               description:
 *                 type: string
 *                 example: We are looking for a Node.js developer.
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Node.js, MongoDB, Express]
 *               location:
 *                 type: string
 *                 example: Cairo
 *               type:
 *                 type: string
 *                 enum: [full-time, part-time, internship]
 *                 example: internship
 *               salary:
 *                 type: number
 *                 example: 3000
 *               totalSlots:
 *                 type: number
 *                 example: 2
 *     responses:
 *       201:
 *         description: Job created with AI-assigned category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 job:
 *                   $ref: '#/components/schemas/JobPost'
 *       403:
 *         description: Account is pending approval
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/')
  .get(getJobs)
  .post(protect, authorize('recruiter'), aiLimiter, createJob);

/**
 * @swagger
 * /jobs/{jobId}/applicants:
 *   get:
 *     summary: Get all applicants for a job (Recruiter — must own the job)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: List of applicants with full user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 applications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       status:
 *                         type: string
 *                       coverLetter:
 *                         type: string
 *                       appliedAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         $ref: '#/components/schemas/User'
 *       403:
 *         description: Not authorised to view applicants for this job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:jobId/applicants", protect, authorize("recruiter"), getJobApplicants);
router.post("/:jobId/apply", protect, authorize("jobSeeker"), applyToJob);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get a single job by ID (public)
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 job:
 *                   $ref: '#/components/schemas/JobPost'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getJobById);

/**
 * @swagger
 * /jobs/{id}:
 *   patch:
 *     summary: Update a job post (Recruiter — must own the job)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     description: If description is changed, AI re-classifies the category automatically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [open, closed]
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               salary:
 *                 type: number
 *     responses:
 *       200:
 *         description: Job updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 job:
 *                   $ref: '#/components/schemas/JobPost'
 *       403:
 *         description: Not authorised to edit this job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', protect, authorize('recruiter'), aiLimiter, updateJob);

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     summary: Delete a job post (Recruiter owner or Admin)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Job deleted
 *       403:
 *         description: Not authorised to delete this job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', protect, authorize('recruiter', 'admin'), deleteJob);

/**
 * @swagger
 * /jobs/{id}/save:
 *   post:
 *     summary: Toggle save/unsave a job (Job Seeker only — open jobs only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job saved or removed from saved list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Job saved
 *                 saved:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Cannot save a closed job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/save', protect, authorize('jobSeeker'), saveJob);
router.post('/:id/cover-letter', protect, authorize('jobSeeker'), aiLimiter, generateCoverLetter);

module.exports = router;