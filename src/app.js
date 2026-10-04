const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const jobsRouter = require('./routes/jobs');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Swagger / OpenAPI configuration
// ---------------------------------------------------------------------------
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Instahyre Reverse-Engineered API',
      version: '1.0.0',
      description:
        'A clean REST API wrapper around Instahyre\'s publicly accessible job-search JSON endpoints. ' +
        'No authentication, cookies, or private data are used.',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./src/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns service health status.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/jobs', jobsRouter);

// ---------------------------------------------------------------------------
// Centralized error handler (must be registered last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
