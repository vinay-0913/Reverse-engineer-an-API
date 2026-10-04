#!/usr/bin/env node

/**
 * Standalone test script for the Instahyre Reverse-Engineered API.
 *
 * Usage:
 *   1. Start the server:  npm start
 *   2. In another terminal: node tests/test-script.js
 *
 * Or run directly (auto-starts the server):
 *   node tests/test-script.js --auto
 *
 * This script tests every API endpoint documented in the README
 * against the running server using real Instahyre data.
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;
let server;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTest(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    passed++;
    console.log('\x1b[32mPASS\x1b[0m');
  } catch (err) {
    failed++;
    console.log(`\x1b[31mFAIL\x1b[0m — ${err.message}`);
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// ---------------------------------------------------------------------------
// Test Cases
// ---------------------------------------------------------------------------

async function main() {
  // Auto-start server if --auto flag is passed
  if (process.argv.includes('--auto')) {
    console.log('Starting server automatically...');
    const app = require('../src/app');
    await new Promise((resolve) => {
      server = app.listen(3000, () => {
        console.log('Server running on http://localhost:3000\n');
        resolve();
      });
    });
  }

  console.log('='.repeat(60));
  console.log(' Instahyre Reverse API — Test Script');
  console.log('='.repeat(60));

  // -----------------------------------------------------------------------
  section('1. Health Check');
  // -----------------------------------------------------------------------

  await runTest('GET /health returns 200 with { status: "ok" }', async () => {
    const { status, body } = await get('/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.status === 'ok', `Expected status "ok", got "${body.status}"`);
  });

  // -----------------------------------------------------------------------
  section('2. Job Search — Full-time Python jobs');
  // -----------------------------------------------------------------------

  let firstJobId;

  await runTest('GET /api/jobs?skills=Python&job_type=1&limit=5 returns 200', async () => {
    const { status, body } = await get('/api/jobs?skills=Python&job_type=1&limit=5');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data, 'Response missing "data" field');
    assert(Array.isArray(body.data), '"data" is not an array');
    assert(body.data.length > 0, '"data" array is empty');
    assert(body.pagination, 'Response missing "pagination" field');
    assert(typeof body.pagination.total === 'number', '"pagination.total" is not a number');

    const job = body.data[0];
    assert(typeof job.id === 'number', 'Job missing numeric "id"');
    assert(typeof job.title === 'string', 'Job missing "title"');
    assert(job.company && typeof job.company.name === 'string', 'Job missing "company.name"');
    assert(typeof job.location === 'string' || job.location === null, 'Job "location" unexpected type');
    assert(Array.isArray(job.keywords), 'Job missing "keywords" array');
    assert(typeof job.url === 'string', 'Job missing "url"');

    firstJobId = job.id;
    console.log(`      → Found ${body.data.length} jobs, total: ${body.pagination.total}`);
  });

  // -----------------------------------------------------------------------
  section('3. Job Search — Internships');
  // -----------------------------------------------------------------------

  await runTest('GET /api/jobs?skills=Python&job_type=2&limit=5 returns 200', async () => {
    const { status, body } = await get('/api/jobs?skills=Python&job_type=2&limit=5');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.data), '"data" is not an array');
    assert(body.pagination, 'Response missing "pagination"');
    console.log(`      → Found ${body.data.length} internships, total: ${body.pagination.total}`);
  });

  // -----------------------------------------------------------------------
  section('4. Pagination');
  // -----------------------------------------------------------------------

  await runTest('GET /api/jobs?skills=Software+Engineer&job_type=1&limit=5&offset=5 paginates correctly', async () => {
    const { status, body } = await get('/api/jobs?skills=Software%20Engineer&job_type=1&limit=5&offset=5');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.pagination.offset === 5, `Expected offset 5, got ${body.pagination.offset}`);
    assert(body.pagination.limit === 5, `Expected limit 5, got ${body.pagination.limit}`);
    assert(body.pagination.previous_offset === 0, `Expected previous_offset 0, got ${body.pagination.previous_offset}`);
    console.log(`      → offset=${body.pagination.offset}, next_offset=${body.pagination.next_offset}, previous_offset=${body.pagination.previous_offset}`);
  });

  // -----------------------------------------------------------------------
  section('5. Single Job by ID');
  // -----------------------------------------------------------------------

  await runTest(`GET /api/jobs/${firstJobId || '<dynamic>'} returns the job`, async () => {
    assert(firstJobId, 'No job ID discovered from search — cannot test');
    const { status, body } = await get(`/api/jobs/${firstJobId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.data, 'Response missing "data"');
    assert(body.data.id === firstJobId, `Expected id ${firstJobId}, got ${body.data.id}`);
    assert(typeof body.data.title === 'string', 'Missing "title"');
    assert(body.data.company && typeof body.data.company.name === 'string', 'Missing "company.name"');
    console.log(`      → "${body.data.title}" at ${body.data.company.name}`);
  });

  // -----------------------------------------------------------------------
  section('6. Job Not Found (404)');
  // -----------------------------------------------------------------------

  await runTest('GET /api/jobs/999999999 returns 404 with JOB_NOT_FOUND', async () => {
    const { status, body } = await get('/api/jobs/999999999');
    assert(status === 404, `Expected 404, got ${status}`);
    assert(body.error, 'Response missing "error" object');
    assert(body.error.code === 'JOB_NOT_FOUND', `Expected code "JOB_NOT_FOUND", got "${body.error.code}"`);
    assert(typeof body.error.message === 'string', 'Missing error message');
  });

  // -----------------------------------------------------------------------
  section('7. Input Validation');
  // -----------------------------------------------------------------------

  await runTest('GET /api/jobs?limit=999 returns 400 (limit too high)', async () => {
    const { status, body } = await get('/api/jobs?limit=999');
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.code === 'INVALID_PARAMETER', `Expected INVALID_PARAMETER, got "${body.error.code}"`);
  });

  await runTest('GET /api/jobs?limit=-5 returns 400 (negative limit)', async () => {
    const { status, body } = await get('/api/jobs?limit=-5');
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.code === 'INVALID_PARAMETER', `Expected INVALID_PARAMETER, got "${body.error.code}"`);
  });

  await runTest('GET /api/jobs?limit=abc returns 400 (non-numeric limit)', async () => {
    const { status, body } = await get('/api/jobs?limit=abc');
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.code === 'INVALID_PARAMETER', `Expected INVALID_PARAMETER, got "${body.error.code}"`);
  });

  await runTest('GET /api/jobs?offset=-1 returns 400 (negative offset)', async () => {
    const { status, body } = await get('/api/jobs?offset=-1');
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.code === 'INVALID_PARAMETER', `Expected INVALID_PARAMETER, got "${body.error.code}"`);
  });

  await runTest('GET /api/jobs/abc returns 400 (non-integer ID)', async () => {
    const { status, body } = await get('/api/jobs/abc');
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.code === 'INVALID_PARAMETER', `Expected INVALID_PARAMETER, got "${body.error.code}"`);
  });

  // -----------------------------------------------------------------------
  section('8. Default Parameters');
  // -----------------------------------------------------------------------

  await runTest('GET /api/jobs (no params) returns 200 with defaults', async () => {
    const { status, body } = await get('/api/jobs');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.pagination.offset === 0, `Default offset should be 0`);
    assert(body.pagination.limit === 20, `Default limit should be 20`);
    console.log(`      → Defaults: limit=${body.pagination.limit}, offset=${body.pagination.offset}, total=${body.pagination.total}`);
  });

  // -----------------------------------------------------------------------
  section('9. Response Shape Verification');
  // -----------------------------------------------------------------------

  await runTest('Normalized job excludes internal/candidate fields', async () => {
    const { status, body } = await get('/api/jobs?skills=Python&limit=1');
    assert(status === 200, `Expected 200, got ${status}`);
    if (body.data.length > 0) {
      const job = body.data[0];
      // These internal fields must NOT be present
      const forbidden = ['interview_status', 'reviewed_at', 'is_strong_match', 'score', 'candidate_title', 'resource_uri'];
      for (const field of forbidden) {
        assert(!(field in job), `Internal field "${field}" should not be exposed`);
      }
      // Required fields must be present
      const required = ['id', 'title', 'company', 'location', 'keywords', 'url'];
      for (const field of required) {
        assert(field in job, `Required field "${field}" is missing`);
      }
    }
  });

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  const total = passed + failed;
  if (failed === 0) {
    console.log(`\x1b[32m ✓ All ${total} tests passed!\x1b[0m`);
  } else {
    console.log(`\x1b[31m ✗ ${failed} of ${total} tests failed.\x1b[0m`);
  }
  console.log('='.repeat(60));

  if (server) server.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  if (server) server.close();
  process.exit(1);
});
