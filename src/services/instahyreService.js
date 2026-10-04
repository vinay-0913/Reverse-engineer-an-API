const axios = require('axios');

const INSTAHYRE_BASE = 'https://www.instahyre.com/api/v1/job_search';
const TIMEOUT_MS = 10_000; // 10-second timeout for upstream requests

const client = axios.create({
  baseURL: INSTAHYRE_BASE,
  timeout: TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Translate Axios errors into application-level errors with appropriate
 * HTTP status codes. Internal stack traces are never exposed.
 */
function handleUpstreamError(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    const timeout = new Error('Instahyre request timed out');
    timeout.statusCode = 504;
    timeout.errorCode = 'GATEWAY_TIMEOUT';
    throw timeout;
  }

  if (err.response) {
    // Upstream returned an HTTP error
    if (err.response.status === 404) {
      const notFound = new Error('Job not found');
      notFound.statusCode = 404;
      notFound.errorCode = 'JOB_NOT_FOUND';
      throw notFound;
    }

    const upstream = new Error('Instahyre service is temporarily unavailable');
    upstream.statusCode = 502;
    upstream.errorCode = 'UPSTREAM_ERROR';
    throw upstream;
  }

  // Network-level failure (DNS, connection refused, etc.)
  const network = new Error('Instahyre service is temporarily unavailable');
  network.statusCode = 502;
  network.errorCode = 'UPSTREAM_ERROR';
  throw network;
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Search jobs on Instahyre.
 * @param {object} params – query parameters to forward (skills, job_type, etc.)
 * @returns {Promise<object>} parsed JSON body from Instahyre
 */
async function searchJobs(params) {
  try {
    const { data } = await client.get('', { params });
    return data;
  } catch (err) {
    handleUpstreamError(err);
  }
}

/**
 * Retrieve a single job by its Instahyre ID.
 * @param {number} id – job ID
 * @returns {Promise<object>} parsed JSON body from Instahyre
 */
async function getJobById(id) {
  try {
    const { data } = await client.get(`/${id}`);
    return data;
  } catch (err) {
    handleUpstreamError(err);
  }
}

module.exports = { searchJobs, getJobById };
