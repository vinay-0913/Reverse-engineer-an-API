const request = require('supertest');
const app = require('../src/app');

// ---------------------------------------------------------------------------
// Increase timeout for integration tests hitting real Instahyre endpoints.
// We are respectful — every test uses small limits and avoids excessive calls.
// ---------------------------------------------------------------------------
jest.setTimeout(30_000);

// ============================= Health ======================================

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ======================== Job Search (integration) =========================

describe('GET /api/jobs — integration', () => {
  it('returns full-time Python jobs', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ skills: 'Python', job_type: 1, limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const job = res.body.data[0];
      expect(job).toHaveProperty('id');
      expect(typeof job.id).toBe('number');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job.company).toHaveProperty('id');
      expect(job.company).toHaveProperty('name');
      expect(job).toHaveProperty('location');
      expect(job).toHaveProperty('keywords');
      expect(job).toHaveProperty('url');
    }

    expect(res.body.pagination).toHaveProperty('offset');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total');
    expect(typeof res.body.pagination.total).toBe('number');
  });

  it('returns internship jobs with job_type=2', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ skills: 'Python', job_type: 2, limit: 5 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  it('supports pagination via offset', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ skills: 'Software Engineer', job_type: 1, limit: 5, offset: 5 });

    expect(res.status).toBe(200);
    expect(res.body.pagination.offset).toBe(5);
    expect(res.body.pagination.limit).toBe(5);
    // previous_offset should exist since offset > 0
    expect(res.body.pagination.previous_offset).toBeDefined();
    expect(res.body.pagination.previous_offset).toBe(0);
  });
});

// ======================== Single Job (integration) =========================

describe('GET /api/jobs/:id — integration', () => {
  // First, discover a real job ID from the search endpoint to avoid
  // relying on a hardcoded ID that may have been removed.
  let realJobId;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ skills: 'Software Engineer', job_type: 1, limit: 1 });

    if (res.status === 200 && res.body.data.length > 0) {
      realJobId = res.body.data[0].id;
    }
  });

  it('returns a single job by ID', async () => {
    // Skip gracefully if we could not discover a real ID
    if (!realJobId) {
      console.warn('Skipping: could not discover a real job ID from search.');
      return;
    }

    const res = await request(app).get(`/api/jobs/${realJobId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(realJobId);
    expect(res.body.data).toHaveProperty('title');
    expect(res.body.data).toHaveProperty('company');
    expect(res.body.data.company).toHaveProperty('name');
  });

  it('returns 404 for a clearly invalid job ID', async () => {
    const res = await request(app).get('/api/jobs/999999999');
    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'JOB_NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});

// ======================== Validation =======================================

describe('Input validation', () => {
  it('rejects limit > 50', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ limit: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARAMETER');
  });

  it('rejects negative offset', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ offset: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARAMETER');
  });

  it('rejects non-numeric limit', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .query({ limit: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARAMETER');
  });

  it('rejects non-integer job ID', async () => {
    const res = await request(app).get('/api/jobs/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARAMETER');
  });
});

// ======================== Mocked failure tests =============================

describe('Upstream failure handling (mocked)', () => {
  let instahyreService;

  beforeEach(() => {
    // Require fresh module so we can mock its methods
    instahyreService = require('../src/services/instahyreService');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 502 when upstream returns 500', async () => {
    jest.spyOn(instahyreService, 'searchJobs').mockRejectedValue(
      (() => {
        const err = new Error('Instahyre service is temporarily unavailable');
        err.statusCode = 502;
        err.errorCode = 'UPSTREAM_ERROR';
        return err;
      })()
    );

    const res = await request(app)
      .get('/api/jobs')
      .query({ skills: 'Python', limit: 5 });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('returns 504 when upstream times out', async () => {
    jest.spyOn(instahyreService, 'searchJobs').mockRejectedValue(
      (() => {
        const err = new Error('Instahyre request timed out');
        err.statusCode = 504;
        err.errorCode = 'GATEWAY_TIMEOUT';
        return err;
      })()
    );

    const res = await request(app)
      .get('/api/jobs')
      .query({ skills: 'Python', limit: 5 });

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('GATEWAY_TIMEOUT');
  });
});
