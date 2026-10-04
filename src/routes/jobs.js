const express = require('express');
const { searchJobs, getJobById } = require('../controllers/jobsController');

const router = express.Router();

/**
 * @openapi
 * /api/jobs:
 *   get:
 *     summary: Search / list jobs
 *     description: >
 *       Queries Instahyre's publicly accessible job-search endpoint and returns
 *       a normalized, paginated list of jobs.
 *     parameters:
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Skill or role keyword (e.g. "Python", "Software Engineer")
 *       - in: query
 *         name: job_type
 *         schema:
 *           type: integer
 *           default: 0
 *         description: "Job type filter — 0: all, 1: full-time, 2: internship"
 *       - in: query
 *         name: company_size
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Company-size bucket (0 = all)
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Job status filter (0 = default)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 50
 *         description: Number of jobs to return (1–50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: A paginated list of normalized jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid query parameter
 *       502:
 *         description: Upstream Instahyre service unavailable
 *       504:
 *         description: Upstream request timed out
 */
router.get('/', searchJobs);

/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     description: >
 *       Retrieves a single job listing from Instahyre by its numeric ID and
 *       returns a normalized response.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The Instahyre job ID
 *     responses:
 *       200:
 *         description: A single normalized job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 *       502:
 *         description: Upstream Instahyre service unavailable
 *       504:
 *         description: Upstream request timed out
 *
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 445450
 *         title:
 *           type: string
 *           example: Staff Engineer
 *         company:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 5276
 *             name:
 *               type: string
 *               example: Tekion
 *             tagline:
 *               type: string
 *             employee_count:
 *               type: integer
 *         location:
 *           type: string
 *           example: Bangalore
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *         url:
 *           type: string
 *           format: uri
 *     Pagination:
 *       type: object
 *       properties:
 *         offset:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         next_offset:
 *           type: integer
 *           nullable: true
 *         previous_offset:
 *           type: integer
 *           nullable: true
 */
router.get('/:id', getJobById);

module.exports = router;
