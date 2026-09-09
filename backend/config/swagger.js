const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GIU Nexus API',
      version: '1.0.0',
      description: 'AI-Powered Career & Talent Platform — Milestone 2',
    },
    servers: [
      // Placeholder — double-check against the URL Render actually assigns once
      // the service is created (it may not match this exactly).
      { url: 'https://careerlink-api.onrender.com/api/v1', description: 'Production (Render)' },
      { url: 'http://localhost:5000/api/v1', description: 'Local Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['jobSeeker', 'recruiter', 'admin'] },
            status: { type: 'string', enum: ['approved', 'pending', 'rejected'] },
            bio: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            profilePicture: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          }
        },
        JobPost: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            company: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' } },
            location: { type: 'string' },
            type: { type: 'string', enum: ['full-time', 'part-time', 'internship'] },
            category: { type: 'string', enum: ['Frontend', 'Backend', 'AI/ML', 'DevOps', 'Data Engineering', 'Other'] },
            status: { type: 'string', enum: ['open', 'closed'] },
            salary: { type: 'number' },
            totalSlots: { type: 'number' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          }
        },
        Application: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            job: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'shortlisted', 'rejected'] },
            coverLetter: { type: 'string' },
            appliedAt: { type: 'string', format: 'date-time' },
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerUiOptions = {
  customSiteTitle: 'GIU Nexus API Docs',
  swaggerOptions: { persistAuthorization: true },
};

module.exports = { swaggerSpec, swaggerUiOptions };
