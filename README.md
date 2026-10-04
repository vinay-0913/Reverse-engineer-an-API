# Instahyre Reverse-Engineered API

A production-quality **Node.js + Express.js** API wrapper that reverse-engineers [Instahyre's](https://www.instahyre.com) publicly accessible job-search JSON endpoints and exposes a clean, documented REST API.

> **Razorpay Forward-Deployed Engineer Assignment** — _"Choose a website that does not offer a public API and build a set of APIs for it."_

---

## Table of Contents

- [Project Overview](#project-overview)
- [Assignment Interpretation](#assignment-interpretation)
- [Reverse-Engineered Endpoints](#reverse-engineered-endpoints)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
- [Example curl Requests](#example-curl-requests)
- [Limitations](#limitations)
- [Production-Ready Approach](#production-ready-approach)
- [Security](#security)
- [License](#license)

---

## Project Overview

Instahyre does **not** provide a public developer API for general job-search consumption. However, its website uses publicly accessible JSON endpoints (served over standard `GET` requests with no authentication headers) to power its frontend job search.

This project:

1. **Reverse-engineers** those publicly accessible HTTP endpoints.
2. **Wraps them** in an independent Express.js API with input validation, error handling, and response normalization.
3. **Documents** the discovered endpoints, parameters, and observed behavior.
4. **Tests** the integration with a real-data test suite.

No authentication bypass, CAPTCHA circumvention, cookie injection, or private-data access is used. Only publicly accessible, unauthenticated `GET` endpoints are consumed.

---

## Assignment Interpretation

The workflow followed:

```
Website (Instahyre)
      ↓
Observe public network requests (browser DevTools → Fetch/XHR)
      ↓
Understand query parameters & JSON response structure
      ↓
Build an independent API abstraction (Express.js)
      ↓
Test with real upstream data
```

---

## Reverse-Engineered Endpoints

### Search / List Jobs

```
GET https://www.instahyre.com/api/v1/job_search
```

**Discovered query parameters:**

| Parameter      | Type    | Description                                        |
| -------------- | ------- | -------------------------------------------------- |
| `skills`       | string  | Skill or role keyword (e.g. `"Python"`)            |
| `job_type`     | integer | `0` = all, `1` = full-time, `2` = internship       |
| `company_size` | integer | Company-size bucket (`0` = all, up to `3`)         |
| `status`       | integer | Job status filter (`0` = default, `1` = active)     |
| `limit`        | integer | Number of results to return                        |
| `offset`       | integer | Pagination offset                                  |

**Observed behavior:**

- `job_type=1` → full-time jobs
- `job_type=2` → internships
- `limit` / `offset` → standard cursor-based pagination
- Response includes `meta.total_count`, `meta.next`, and `meta.previous`
- Response contains `objects[]` with job details including `employer`, `title`, `locations`, `keywords`, `public_url`

### Individual Job

```
GET https://www.instahyre.com/api/v1/job_search/:id
```

Returns a single job object in the same structure.

**Verification:** Both endpoints return structured JSON without `Cookie`, `Authorization`, `X-CSRFToken`, or other authentication headers.

---

## Architecture

```
Client (curl / frontend / Postman)
        │
        ▼
┌─────────────────────────┐
│   Express.js API        │
│   /api/jobs             │
│   /api/jobs/:id         │
│   /health               │
├─────────────────────────┤
│   Input Validation      │
│   Response Normalization│
│   Error Handling        │
└─────────┬───────────────┘
          │ Axios
          ▼
┌─────────────────────────┐
│  Instahyre JSON Endpoint│
│  (publicly accessible)  │
└─────────────────────────┘
```

**Project structure:**

```
instahyre-reverse-api/
├── src/
│   ├── server.js                # Entry point
│   ├── app.js                   # Express app setup, Swagger, routes
│   ├── routes/
│   │   └── jobs.js              # Route definitions with OpenAPI docs
│   ├── controllers/
│   │   └── jobsController.js    # Validation + orchestration
│   ├── services/
│   │   └── instahyreService.js  # All Instahyre HTTP communication
│   ├── utils/
│   │   └── normalizeJob.js      # Response normalization
│   └── middleware/
│       └── errorHandler.js      # Centralized error handler
├── tests/
│   └── api.test.js              # Integration + mocked tests
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

---

## API Endpoints

### `GET /health`

Health check.

```json
{ "status": "ok" }
```

### `GET /api/jobs`

Search / list jobs.

| Query Parameter | Default | Description                         |
| --------------- | ------- | ----------------------------------- |
| `skills`        | —       | Skill keyword filter                |
| `job_type`      | `0`     | `0` all, `1` full-time, `2` intern |
| `company_size`  | `0`     | Company-size bucket                 |
| `status`        | `0`     | Job status                          |
| `limit`         | `20`    | Results per page (1–50)             |
| `offset`        | `0`     | Pagination offset                   |

**Response:**

```json
{
  "data": [
    {
      "id": 445450,
      "title": "Staff Engineer",
      "company": {
        "id": 5276,
        "name": "Tekion",
        "tagline": "Transforming Automotive Retail...",
        "employee_count": 1000
      },
      "location": "Bangalore",
      "keywords": ["Java", "AI agent", "LangChain"],
      "url": "https://www.instahyre.com/job-445450-..."
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 9752,
    "next_offset": 20,
    "previous_offset": null
  }
}
```

### `GET /api/jobs/:id`

Get a single job by ID.

**Response:**

```json
{
  "data": {
    "id": 445450,
    "title": "Staff Engineer",
    "company": { "id": 5276, "name": "Tekion", "tagline": "...", "employee_count": 1000 },
    "location": "Bangalore",
    "keywords": ["Java", "AI agent", "LangChain"],
    "url": "https://www.instahyre.com/job-445450-..."
  }
}
```

**404 when not found:**

```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Job not found"
  }
}
```

### `GET /api-docs`

Interactive Swagger UI with full API documentation.

---

## Installation

```bash
git clone <repo-url>
cd instahyre-reverse-api
npm install
```

## Development

```bash
npm run dev
```

The server starts at `http://localhost:3000` with file-watch auto-restart.

## Running

```bash
npm start
```

## Testing

```bash
npm test
```

The test suite includes:

- **Integration tests** — hit the real Instahyre endpoint through our API
- **Validation tests** — verify input validation (limit, offset, ID)
- **Mocked failure tests** — simulate upstream 500 and timeout scenarios

---

## Example curl Requests

```bash
# Health check
curl http://localhost:3000/health

# Search full-time Python jobs
curl "http://localhost:3000/api/jobs?skills=Python&job_type=1&limit=5"

# Search internships
curl "http://localhost:3000/api/jobs?skills=Python&job_type=2&limit=5"

# Pagination
curl "http://localhost:3000/api/jobs?skills=Software+Engineer&job_type=1&limit=5&offset=5"

# Single job
curl "http://localhost:3000/api/jobs/445450"
```

---

## Limitations

1. **Undocumented endpoints** — Instahyre's internal API is not publicly documented; endpoint paths, parameter names, and response schemas can change without notice.
2. **No guaranteed availability** — Instahyre may introduce rate limiting, authentication requirements, CAPTCHA, or WAF rules at any time.
3. **Schema fragility** — The response normalization depends on the observed JSON structure. If Instahyre changes field names or nesting, our normalization will break.
4. **Pagination behavior** — Cursor/offset pagination is inferred from observation. Edge cases (e.g., total_count accuracy, deep offsets) may behave differently than expected.
5. **No caching** — Every request hits Instahyre in real time. High traffic would create proportional upstream load.
6. **Single region** — Network latency depends on the client's and Instahyre's geographic proximity.
7. **No authentication bypass** — Any endpoints that Instahyre gates behind authentication are intentionally excluded.

---

## Production-Ready Approach

The appropriate long-term solution would be:

1. **Official API partnership** — Establish a formally supported API integration or data-sharing agreement with Instahyre, with documented contracts, authentication, rate limits, versioning, and SLA.

Additional production improvements:

| Improvement                  | Purpose                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| Schema validation (e.g. Zod) | Detect upstream response changes at runtime                  |
| Retries with backoff         | Handle transient upstream failures gracefully                 |
| Circuit breaker              | Prevent cascading failures during sustained upstream outages  |
| Caching (where permitted)    | Reduce upstream load and improve response times               |
| Observability                | Structured logging, metrics, distributed tracing              |
| Upstream health monitoring   | Alert on upstream availability/schema changes                 |
| API versioning               | Protect consumers from breaking changes in our API            |
| Automated contract tests     | Detect upstream API changes in CI/CD                          |
| Rate limiting (our API)      | Protect ourselves and the upstream from abuse                 |

---

## Security

This project:

- ✅ Uses **only** publicly accessible, unauthenticated `GET` endpoints
- ✅ Does **not** use cookies, CSRF tokens, session IDs, or Authorization headers
- ✅ Does **not** bypass CAPTCHA, WAF, or any access controls
- ✅ Does **not** access private candidate data or authenticated pages
- ✅ Does **not** automate login or circumvent rate limits
- ✅ Does **not** contain hardcoded credentials or leaked tokens

---

## License

[MIT](./LICENSE)
