const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'customer') {
      query = `
        SELECT p.*, u.name as user_name
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT p.*, u.name as user_name
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Create payment
router.post('/', [
  authenticateToken,
  body('service_id').isIn(['ticketing-monthly', 'ticketing-per-use', 'home-service-monthly', 'home-service-per-use', 'premium-monitoring']),
  body('subscription_type').isIn(['monthly', 'per-use']),
  body('amount').isDecimal({ decimal_digits: '0,2' }),
  body('payment_method').trim().isLength({ min: 3 }),
  body('card_number').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { service_id, subscription_type, amount, payment_method, card_number } = req.body;

  try {
    // Mask card number for storage (only store last 4 digits)
    let maskedCardNumber = null;
    if (card_number) {
      maskedCardNumber = `****-****-****-${card_number.slice(-4)}`;
    }

    const result = await pool.query(
      `INSERT INTO payments (user_id, service_id, subscription_type, amount, payment_method, card_number, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [req.user.id, service_id, subscription_type, amount, payment_method, maskedCardNumber, 'completed']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Get payment by ID
router.get('/:paymentId', authenticateToken, async (req, res) => {
  const { paymentId } = req.params;

  try {
    let query = `
      SELECT p.*, u.name as user_name
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;
    let params = [paymentId];

    if (req.user.role === 'customer') {
      query += ' AND p.user_id = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Update payment status (admin only)
router.put('/:paymentId/status', [
  authenticateToken,
  requireRole(['admin']),
  body('status').isIn(['pending', 'completed', 'failed', 'refunded'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { paymentId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
      [status, paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

module.exports = router;