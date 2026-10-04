const instahyreService = require('../services/instahyreService');
const { normalizeJob, normalizePagination } = require('../utils/normalizeJob');

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Parse a query-string value as a non-negative integer.
 * Returns `defaultVal` when the value is undefined.
 * Throws a descriptive error when the value is present but invalid.
 */
function parseNonNegativeInt(value, name, defaultVal) {
  if (value === undefined || value === '') return defaultVal;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const err = new Error(`${name} must be a non-negative integer`);
    err.statusCode = 400;
    err.errorCode = 'INVALID_PARAMETER';
    throw err;
  }
  return parsed;
}

function parsePositiveInt(value, name, defaultVal) {
  if (value === undefined || value === '') return defaultVal;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    const err = new Error(`${name} must be a positive integer`);
    err.statusCode = 400;
    err.errorCode = 'INVALID_PARAMETER';
    throw err;
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

async function searchJobs(req, res, next) {
  try {
    // --- Parse & validate query parameters ---
    const limit = parsePositiveInt(req.query.limit, 'limit', 20);
    if (limit > 50) {
      const err = new Error('limit must be between 1 and 50');
      err.statusCode = 400;
      err.errorCode = 'INVALID_PARAMETER';
      throw err;
    }

    const offset = parseNonNegativeInt(req.query.offset, 'offset', 0);
    const job_type = parseNonNegativeInt(req.query.job_type, 'job_type', 0);
    const company_size = parseNonNegativeInt(req.query.company_size, 'company_size', 0);
    const status = parseNonNegativeInt(req.query.status, 'status', 0);

    let skills;
    if (req.query.skills !== undefined && req.query.skills !== '') {
      if (typeof req.query.skills !== 'string' || req.query.skills.trim().length === 0) {
        const err = new Error('skills must be a non-empty string');
        err.statusCode = 400;
        err.errorCode = 'INVALID_PARAMETER';
        throw err;
      }
      skills = req.query.skills.trim();
    }

    // --- Build upstream params (only include defined values) ---
    const params = { limit, offset, job_type, company_size, status };
    if (skills) params.skills = skills;

    const upstream = await instahyreService.searchJobs(params);

    // --- Normalize response ---
    const data = (upstream.objects || []).map(normalizeJob);
    const pagination = normalizePagination(upstream.meta, limit, offset);

    res.json({ data, pagination });
  } catch (err) {
    next(err);
  }
}

async function getJobById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      const err = new Error('Job ID must be a positive integer');
      err.statusCode = 400;
      err.errorCode = 'INVALID_PARAMETER';
      throw err;
    }

    const upstream = await instahyreService.getJobById(id);
    const data = normalizeJob(upstream);

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchJobs, getJobById };
