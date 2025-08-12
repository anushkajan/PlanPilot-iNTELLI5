const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { vendors, events } = require('../data/inMemoryDB');

const router = express.Router();

// Apply authentication to all vendor routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/events/{eventId}/vendors:
 *   post:
 *     summary: Add a new vendor to an event
 *     tags: [Vendors]
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
 *               - companyName
 *               - contactName
 *               - email
 *               - serviceProvided
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "Elegant Catering"
 *               contactName:
 *                 type: string
 *                 example: "Sarah Johnson"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "sarah@elegantcatering.com"
 *               serviceProvided:
 *                 type: string
 *                 example: "Catering"
 *     responses:
 *       201:
 *         description: Vendor added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vendor'
 *       400:
 *         description: Validation error or vendor already exists
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/vendors', [
  body('companyName').trim().isLength({ min: 1 }).withMessage('Company name is required'),
  body('contactName').trim().isLength({ min: 1 }).withMessage('Contact name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('serviceProvided').trim().isLength({ min: 1 }).withMessage('Service provided is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { companyName, contactName, email, serviceProvided } = req.body;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Check if vendor already exists for this event
    const existingVendor = vendors.find(v => v.eventId === eventId && v.email === email);
    if (existingVendor) {
      return res.status(400).json({ error: 'Vendor with this email already exists for this event' });
    }

    // Create new vendor
    const newVendor = {
      id: uuidv4(),
      companyName,
      contactName,
      email,
      serviceProvided,
      eventId,
      createdAt: new Date()
    };

    vendors.push(newVendor);

    // Return vendor data (without internal fields)
    const { eventId: _, createdAt: __, ...vendorResponse } = newVendor;
    res.status(201).json(vendorResponse);

  } catch (error) {
    console.error('Add vendor error:', error);
    res.status(500).json({ error: 'Internal server error while adding vendor' });
  }
});

/**
 * @swagger
 * /api/events/{eventId}/vendors:
 *   get:
 *     summary: Get all vendors for an event
 *     tags: [Vendors]
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
 *         description: List of vendors for the event
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   companyName:
 *                     type: string
 *                   contactName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   serviceProvided:
 *                     type: string
 *       404:
 *         description: Event not found
 */
router.get('/:eventId/vendors', async (req, res) => {
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

    // Get vendors for this event
    const eventVendors = vendors.filter(vendor => vendor.eventId === eventId);

    // Return vendor list data
    const vendorList = eventVendors.map(vendor => ({
      id: vendor.id,
      companyName: vendor.companyName,
      contactName: vendor.contactName,
      email: vendor.email,
      serviceProvided: vendor.serviceProvided
    }));

    res.json(vendorList);

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Internal server error while fetching vendors' });
  }
});

// Get a Specific Vendor
router.get('/:eventId/vendors/:vendorId', async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find the vendor
    const vendor = vendors.find(v => v.id === vendorId && v.eventId === eventId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Return vendor data (without internal fields)
    const { eventId: _, createdAt: __, ...vendorResponse } = vendor;
    res.json(vendorResponse);

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Internal server error while fetching vendor' });
  }
});

// Update a Vendor
router.put('/:eventId/vendors/:vendorId', [
  body('companyName').optional().trim().isLength({ min: 1 }).withMessage('Company name cannot be empty'),
  body('contactName').optional().trim().isLength({ min: 1 }).withMessage('Contact name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('serviceProvided').optional().trim().isLength({ min: 1 }).withMessage('Service provided cannot be empty')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, vendorId } = req.params;
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

    // Find the vendor
    const vendorIndex = vendors.findIndex(v => v.id === vendorId && v.eventId === eventId);
    if (vendorIndex === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendors[vendorIndex];

    // Update vendor fields
    if (updates.companyName) vendor.companyName = updates.companyName;
    if (updates.contactName) vendor.contactName = updates.contactName;
    if (updates.email) vendor.email = updates.email;
    if (updates.serviceProvided) vendor.serviceProvided = updates.serviceProvided;

    // Return updated vendor data (without internal fields)
    const { eventId: _, createdAt: __, ...vendorResponse } = vendor;
    res.json(vendorResponse);

  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Internal server error while updating vendor' });
  }
});

// Delete a Vendor
router.delete('/:eventId/vendors/:vendorId', async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find and remove the vendor
    const vendorIndex = vendors.findIndex(v => v.id === vendorId && v.eventId === eventId);
    if (vendorIndex === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendors.splice(vendorIndex, 1);

    res.status(204).send();

  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Internal server error while deleting vendor' });
  }
});

module.exports = router; 