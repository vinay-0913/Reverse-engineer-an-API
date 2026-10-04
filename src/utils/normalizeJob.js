/**
 * Normalize a single Instahyre job object into our clean API shape.
 *
 * Only publicly useful fields are included. Internal/candidate-specific fields
 * (interview_status, reviewed_at, is_strong_match, score, candidate_title, etc.)
 * are intentionally excluded.
 */
function normalizeJob(raw) {
  if (!raw) return null;

  const employer = raw.employer || {};

  return {
    id: raw.id,
    title: raw.title || null,
    company: {
      id: employer.id || null,
      name: employer.company_name || null,
      tagline: employer.company_tagline || null,
      employee_count: employer.employee_count || null,
    },
    location: raw.locations || null,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    url: raw.public_url || null,
  };
}

/**
 * Build a clean pagination object from Instahyre's `meta` block.
 */
function normalizePagination(meta, limit, offset) {
  if (!meta) {
    return { offset, limit, total: 0, next_offset: null, previous_offset: null };
  }

  const total = meta.total_count ?? 0;
  const nextOffset = meta.next ? offset + limit : null;
  const previousOffset = offset > 0 ? Math.max(0, offset - limit) : null;

  return {
    offset,
    limit,
    total,
    next_offset: nextOffset,
    previous_offset: previousOffset,
  };
}

module.exports = { normalizeJob, normalizePagination };
