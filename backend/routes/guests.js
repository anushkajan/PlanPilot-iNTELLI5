const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { guests, events } = require('../data/inMemoryDB');

const router = express.Router();

// Apply authentication to all guest routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/events/{eventId}/guests:
 *   post:
 *     summary: Add a new guest to an event
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Smith"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               plusOne:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1
 *               notes:
 *                 type: string
 *                 example: "Vegetarian meal preference"
 *     responses:
 *       201:
 *         description: Guest added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guest'
 *       400:
 *         description: Validation error or guest already exists
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/guests', [
  body('name').trim().isLength({ min: 1 }).withMessage('Guest name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('plusOne').optional().isInt({ min: 0 }).withMessage('Plus one count must be a non-negative integer'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { name, email, plusOne, notes } = req.body;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Check if guest already exists for this event
    const existingGuest = guests.find(g => g.eventId === eventId && g.email === email);
    if (existingGuest) {
      return res.status(400).json({ error: 'Guest with this email already exists for this event' });
    }

    // Create new guest
    const newGuest = {
      id: uuidv4(),
      name,
      email,
      plusOne: plusOne || 0,
      notes: notes || '',
      rsvpStatus: 'Pending',
      eventId,
      createdAt: new Date()
    };

    guests.push(newGuest);

    // Return guest data (without internal fields)
    const { eventId: _, createdAt: __, ...guestResponse } = newGuest;
    res.status(201).json(guestResponse);

  } catch (error) {
    console.error('Add guest error:', error);
    res.status(500).json({ error: 'Internal server error while adding guest' });
  }
});

/**
 * @swagger
 * /api/events/{eventId}/guests:
 *   get:
 *     summary: Get guest list for an event
 *     tags: [Guests]
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
 *         description: List of guests for the event
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
 *                   email:
 *                     type: string
 *                   rsvpStatus:
 *                     type: string
 *                   plusOne:
 *                     type: integer
 *       404:
 *         description: Event not found
 */
router.get('/:eventId/guests', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Get guests for this event
    const eventGuests = guests.filter(guest => guest.eventId === eventId);

    // Return guest list data
    const guestList = eventGuests.map(guest => ({
      id: guest.id,
      name: guest.name,
      email: guest.email,
      rsvpStatus: guest.rsvpStatus,
      plusOne: guest.plusOne
    }));

    res.json(guestList);

  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ error: 'Internal server error while fetching guests' });
  }
});

// Get a Specific Guest
router.get('/:eventId/guests/:guestId', async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find the guest
    const guest = guests.find(g => g.id === guestId && g.eventId === eventId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    // Return guest data (without internal fields)
    const { eventId: _, createdAt: __, ...guestResponse } = guest;
    res.json(guestResponse);

  } catch (error) {
    console.error('Get guest error:', error);
    res.status(500).json({ error: 'Internal server error while fetching guest' });
  }
});

// Update Guest RSVP Status
router.put('/:eventId/guests/:guestId', [
  body('rsvpStatus').isIn(['Pending', 'Confirmed', 'Declined', 'Maybe']).withMessage('Invalid RSVP status'),
  body('plusOne').optional().isInt({ min: 0 }).withMessage('Plus one count must be a non-negative integer'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, guestId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find the guest
    const guestIndex = guests.findIndex(g => g.id === guestId && g.eventId === eventId);
    if (guestIndex === -1) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    const guest = guests[guestIndex];

    // Update guest fields
    if (updates.rsvpStatus) guest.rsvpStatus = updates.rsvpStatus;
    if (updates.plusOne !== undefined) guest.plusOne = updates.plusOne;
    if (updates.notes !== undefined) guest.notes = updates.notes;

    // Return updated guest data (without internal fields)
    const { eventId: _, createdAt: __, ...guestResponse } = guest;
    res.json(guestResponse);

  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({ error: 'Internal server error while updating guest' });
  }
});

// Delete a Guest
router.delete('/:eventId/guests/:guestId', async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find and remove the guest
    const guestIndex = guests.findIndex(g => g.id === guestId && g.eventId === eventId);
    if (guestIndex === -1) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    guests.splice(guestIndex, 1);

    res.status(204).send();

  } catch (error) {
    console.error('Delete guest error:', error);
    res.status(500).json({ error: 'Internal server error while deleting guest' });
  }
});

module.exports = router; 