/**
 * Centralized Express error handler.
 *
 * Translates application errors into a consistent JSON envelope.
 * Internal stack traces are never leaked to API consumers.
 */
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';
  const message = statusCode === 500
    ? 'An unexpected error occurred'
    : err.message;

  // Log the full error for server-side debugging (never sent to client)
  if (statusCode >= 500) {
    console.error('[ErrorHandler]', err);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
    },
  });
}

module.exports = errorHandler;
