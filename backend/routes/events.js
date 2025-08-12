const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { events, users } = require('../data/inMemoryDB');

const router = express.Router();

// Apply authentication to all event routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Summer Wedding"
 *               type:
 *                 type: string
 *                 example: "Wedding"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-07-15"
 *               description:
 *                 type: string
 *                 example: "Beautiful summer wedding celebration"
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Event name is required'),
  body('type').trim().isLength({ min: 1 }).withMessage('Event type is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, date, description } = req.body;
    const hostId = req.user.id;

    // Create new event
    const newEvent = {
      id: uuidv4(),
      name,
      type,
      date: new Date(date),
      description: description || '',
      hostId,
      collaborators: [],
      vendors: [],
      createdAt: new Date()
    };

    events.push(newEvent);

    // Return event data
    res.status(201).json(newEvent);

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error while creating event' });
  }
});

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events for the authenticated user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date
 *                   progress:
 *                     type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get events where user is host or collaborator
    const userEvents = events.filter(event => 
      event.hostId === userId || event.collaborators.includes(userId)
    );

    // Return simplified event data for list view
    const eventList = userEvents.map(event => ({
      id: event.id,
      name: event.name,
      type: event.type,
      date: event.date,
      progress: calculateEventProgress(event.id) // Helper function
    }));

    res.json(eventList);

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error while fetching events' });
  }
});

/**
 * @swagger
 * /api/events/{eventId}:
 *   get:
 *     summary: Get a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *       403:
 *         description: Access denied
 */
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Find the event
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user has access to this event
    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    res.json(event);

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error while fetching event' });
  }
});

// Update Event
router.put('/:eventId', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Event name cannot be empty'),
  body('type').optional().trim().isLength({ min: 1 }).withMessage('Event type cannot be empty'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Find the event
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[eventIndex];

    // Check if user is the host
    if (event.hostId !== userId) {
      return res.status(403).json({ error: 'Only the event host can update this event' });
    }

    // Update event fields
    if (updates.name) event.name = updates.name;
    if (updates.type) event.type = updates.type;
    if (updates.date) event.date = new Date(updates.date);
    if (updates.description !== undefined) event.description = updates.description;

    res.json(event);

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error while updating event' });
  }
});

// Delete Event
router.delete('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Find the event
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[eventIndex];

    // Check if user is the host
    if (event.hostId !== userId) {
      return res.status(403).json({ error: 'Only the event host can delete this event' });
    }

    // Remove event from array
    events.splice(eventIndex, 1);

    res.status(204).send();

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error while deleting event' });
  }
});

// Helper function to calculate event progress
function calculateEventProgress(eventId) {
  // This would typically calculate based on completed tasks
  // For now, return a random progress value
  return Math.floor(Math.random() * 100);
}

module.exports = router; 