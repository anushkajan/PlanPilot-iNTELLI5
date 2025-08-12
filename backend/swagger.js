const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PlanPilot API',
      version: '1.0.0',
      description: 'Complete API documentation for PlanPilot Event Management Tool',
      contact: {
        name: 'PlanPilot Team',
        email: 'support@planpilot.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            name: { type: 'string', example: 'Summer Wedding' },
            type: { type: 'string', example: 'Wedding' },
            date: { type: 'string', format: 'date' },
            description: { type: 'string', example: 'Beautiful summer wedding celebration' },
            hostId: { type: 'string', example: 'user-uuid' },
            collaborators: { type: 'array', items: { type: 'string' } },
            vendors: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            name: { type: 'string', example: 'Book Venue' },
            description: { type: 'string', example: 'Find and book the perfect wedding venue' },
            assigneeId: { type: 'string', example: 'user-uuid' },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['To-Do', 'In Progress', 'Completed', 'On Hold'] },
            eventId: { type: 'string', example: 'event-uuid' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Guest: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            name: { type: 'string', example: 'Jane Smith' },
            email: { type: 'string', example: 'jane@example.com' },
            plusOne: { type: 'integer', example: 1 },
            notes: { type: 'string', example: 'Vegetarian meal preference' },
            rsvpStatus: { type: 'string', enum: ['Pending', 'Confirmed', 'Declined', 'Maybe'] },
            eventId: { type: 'string', example: 'event-uuid' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            companyName: { type: 'string', example: 'Elegant Catering' },
            contactName: { type: 'string', example: 'Sarah Johnson' },
            email: { type: 'string', example: 'sarah@elegantcatering.com' },
            serviceProvided: { type: 'string', example: 'Catering' },
            eventId: { type: 'string', example: 'event-uuid' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            name: { type: 'string', example: 'Venue Deposit' },
            category: { type: 'string', example: 'Venue' },
            amount: { type: 'number', example: 2500 },
            isPaid: { type: 'boolean', example: true },
            eventId: { type: 'string', example: 'event-uuid' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'jwt-token-here' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message here' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './routes/auth.js',
    './routes/events.js', 
    './routes/tasks.js',
    './routes/guests.js',
    './routes/vendors.js',
    './routes/expenses.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 