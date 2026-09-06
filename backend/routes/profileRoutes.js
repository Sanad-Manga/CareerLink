const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getProfile, updateProfile, changePassword, extractSkills } = require('../controllers/profileController');
const upload = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Profile management endpoints
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: Update the logged-in user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sara Ahmed
 *               bio:
 *                 type: string
 *                 example: Experienced React and Node.js developer
 *               profilePicture:
 *                 type: string
 *                 example: https://example.com/photo.jpg
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route('/')
  .get(protect, getProfile)
  .patch(protect, upload.single('profilePicture'), updateProfile);

/**
 * @swagger
 * /profile/change-password:
 *   patch:
 *     summary: Change password while logged in
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldSecret123
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newSecret456
 *     responses:
 *       200:
 *         description: Password updated successfully
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
 *                   example: Password updated successfully
 *       401:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/change-password', protect, changePassword);

/**
 * @swagger
 * /profile/extract-skills:
 *   post:
  *     summary: Extract skills from bio using keyword matching (Job Seeker only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Reads the job seeker's bio from the database and matches it against
 *       a curated list of known technical skills and tools using regex matching.
 *       The matched results are saved back to `user.skills`. No request body required.
 *     responses:
 *       200:
 *         description: Skills extracted and saved to profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [React, Node.js, MongoDB]
 *                 extracted:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [React, Node.js, MongoDB]
 *       400:
 *         description: Bio is empty. Update your profile first.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Job seekers only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/extract-skills', protect, authorize('jobSeeker'), extractSkills);

module.exports = router;