const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { expenses, events } = require('../data/inMemoryDB');

const router = express.Router();

// Apply authentication to all expense routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/events/{eventId}/expenses:
 *   post:
 *     summary: Add a new expense for an event
 *     tags: [Expenses]
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
 *               - category
 *               - amount
 *               - isPaid
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Venue Deposit"
 *               category:
 *                 type: string
 *                 example: "Venue"
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 2500
 *               isPaid:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Expense added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/expenses', [
  body('name').trim().isLength({ min: 1 }).withMessage('Expense name is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Expense category is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('isPaid').isBoolean().withMessage('isPaid must be a boolean value')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { name, category, amount, isPaid } = req.body;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Create new expense
    const newExpense = {
      id: uuidv4(),
      name,
      category,
      amount: parseFloat(amount),
      isPaid: Boolean(isPaid),
      eventId,
      createdAt: new Date()
    };

    expenses.push(newExpense);

    // Return expense data (without internal fields)
    const { eventId: _, createdAt: __, ...expenseResponse } = newExpense;
    res.status(201).json(expenseResponse);

  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Internal server error while adding expense' });
  }
});

/**
 * @swagger
 * /api/events/{eventId}/expenses:
 *   get:
 *     summary: Get all expenses for an event with budget summary
 *     tags: [Expenses]
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
 *         description: List of expenses with budget summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expenses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Expense'
 *                 budgetSummary:
 *                   type: object
 *                   properties:
 *                     totalBudget:
 *                       type: number
 *                     paidAmount:
 *                       type: number
 *                     pendingAmount:
 *                       type: number
 *       404:
 *         description: Event not found
 */
router.get('/:eventId/expenses', async (req, res) => {
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

    // Get expenses for this event
    const eventExpenses = expenses.filter(expense => expense.eventId === eventId);

    // Calculate budget summary
    const totalBudget = eventExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paidAmount = eventExpenses
      .filter(expense => expense.isPaid)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pendingAmount = totalBudget - paidAmount;

    // Return expenses with budget summary
    const expenseList = eventExpenses.map(expense => ({
      id: expense.id,
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      isPaid: expense.isPaid
    }));

    res.json({
      expenses: expenseList,
      budgetSummary: {
        totalBudget,
        paidAmount,
        pendingAmount
      }
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Internal server error while fetching expenses' });
  }
});

// Get a Specific Expense
router.get('/:eventId/expenses/:expenseId', async (req, res) => {
  try {
    const { eventId, expenseId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find the expense
    const expense = expenses.find(e => e.id === expenseId && e.eventId === eventId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Return expense data (without internal fields)
    const { eventId: _, createdAt: __, ...expenseResponse } = expense;
    res.json(expenseResponse);

  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Internal server error while fetching expense' });
  }
});

// Update an Expense
router.put('/:eventId/expenses/:expenseId', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Expense name cannot be empty'),
  body('category').optional().trim().isLength({ min: 1 }).withMessage('Expense category cannot be empty'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('isPaid').optional().isBoolean().withMessage('isPaid must be a boolean value')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, expenseId } = req.params;
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

    // Find the expense
    const expenseIndex = expenses.findIndex(e => e.id === expenseId && e.eventId === eventId);
    if (expenseIndex === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = expenses[expenseIndex];

    // Update expense fields
    if (updates.name) expense.name = updates.name;
    if (updates.category) expense.category = updates.category;
    if (updates.amount !== undefined) expense.amount = parseFloat(updates.amount);
    if (updates.isPaid !== undefined) expense.isPaid = Boolean(updates.isPaid);

    // Return updated expense data (without internal fields)
    const { eventId: _, createdAt: __, ...expenseResponse } = expense;
    res.json(expenseResponse);

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Internal server error while updating expense' });
  }
});

// Delete an Expense
router.delete('/:eventId/expenses/:expenseId', async (req, res) => {
  try {
    const { eventId, expenseId } = req.params;
    const userId = req.user.id;

    // Verify event exists and user has access
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== userId && !event.collaborators.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Find and remove the expense
    const expenseIndex = expenses.findIndex(e => e.id === expenseId && e.eventId === eventId);
    if (expenseIndex === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    expenses.splice(expenseIndex, 1);

    res.status(204).send();

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal server error while deleting expense' });
  }
});

// Get Budget Summary
router.get('/:eventId/expenses/summary/budget', async (req, res) => {
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

    // Get expenses for this event
    const eventExpenses = expenses.filter(expense => expense.eventId === eventId);

    // Calculate budget summary
    const totalBudget = eventExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paidAmount = eventExpenses
      .filter(expense => expense.isPaid)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pendingAmount = totalBudget - paidAmount;

    // Group by category
    const categoryBreakdown = eventExpenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {});

    res.json({
      totalBudget,
      paidAmount,
      pendingAmount,
      categoryBreakdown
    });

  } catch (error) {
    console.error('Get budget summary error:', error);
    res.status(500).json({ error: 'Internal server error while fetching budget summary' });
  }
});

module.exports = router; 