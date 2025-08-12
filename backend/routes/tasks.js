const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { tasks, events } = require('../data/inMemoryDB');

const router = express.Router();

// Apply authentication to all task routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/events/{eventId}/tasks:
 *   post:
 *     summary: Create a new task for an event
 *     tags: [Tasks]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Book Venue"
 *               description:
 *                 type: string
 *                 example: "Find and book the perfect wedding venue"
 *               assigneeId:
 *                 type: string
 *                 example: "user-uuid"
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-01"
 *               status:
 *                 type: string
 *                 enum: [To-Do, In Progress, Completed, On Hold]
 *                 example: "To-Do"
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/tasks', [
  body('name').trim().isLength({ min: 1 }).withMessage('Task name is required'),
  body('description').optional().trim(),
  body('assigneeId').optional().isUUID().withMessage('Invalid assignee ID'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('status').optional().isIn(['To-Do', 'In Progress', 'Completed', 'On Hold']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { name, description, assigneeId, dueDate, status } = req.body;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Create new task
    const newTask = {
      id: uuidv4(),
      name,
      description: description || '',
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || 'To-Do',
      eventId,
      createdAt: new Date()
    };

    tasks.push(newTask);

    res.status(201).json(newTask);

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error while creating task' });
  }
});

/**
 * @swagger
 * /api/events/{eventId}/tasks:
 *   get:
 *     summary: Get all tasks for an event
 *     tags: [Tasks]
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
 *         description: List of tasks for the event
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
 *                   assigneeId:
 *                     type: string
 *                   status:
 *                     type: string
 *                   dueDate:
 *                     type: string
 *                     format: date
 *       404:
 *         description: Event not found
 */
router.get('/:eventId/tasks', async (req, res) => {
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

    // Get tasks for this event
    const eventTasks = tasks.filter(task => task.eventId === eventId);

    // Return simplified task data for list view
    const taskList = eventTasks.map(task => ({
      id: task.id,
      name: task.name,
      assigneeId: task.assigneeId,
      status: task.status,
      dueDate: task.dueDate
    }));

    res.json(taskList);

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error while fetching tasks' });
  }
});

// Get a Specific Task
router.get('/:eventId/tasks/:taskId', async (req, res) => {
  try {
    const { eventId, taskId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find the task
    const task = tasks.find(t => t.id === taskId && t.eventId === eventId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error while fetching task' });
  }
});

// Update a Task
router.put('/:eventId/tasks/:taskId', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Task name cannot be empty'),
  body('description').optional().trim(),
  body('assigneeId').optional().isUUID().withMessage('Invalid assignee ID'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('status').optional().isIn(['To-Do', 'In Progress', 'Completed', 'On Hold']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, taskId } = req.params;
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

    // Find the task
    const taskIndex = tasks.findIndex(t => t.id === taskId && t.eventId === eventId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[taskIndex];

    // Update task fields
    if (updates.name) task.name = updates.name;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.assigneeId !== undefined) task.assigneeId = updates.assigneeId;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.status) task.status = updates.status;

    res.json(task);

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error while updating task' });
  }
});

// Delete a Task
router.delete('/:eventId/tasks/:taskId', async (req, res) => {
  try {
    const { eventId, taskId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find and remove the task
    const taskIndex = tasks.findIndex(t => t.id === taskId && t.eventId === eventId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    tasks.splice(taskIndex, 1);

    res.status(204).send();

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error while deleting task' });
  }
});

module.exports = router; 