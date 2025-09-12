const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get complaints
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'customer') {
      query = `
        SELECT c.*, u.name as customer_name
        FROM complaints c
        LEFT JOIN users u ON c.customer_id = u.id
        WHERE c.customer_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT c.*, u.name as customer_name
        FROM complaints c
        LEFT JOIN users u ON c.customer_id = u.id
        ORDER BY c.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching complaints:', error.stack);
    res.status(500).json({ error: 'Failed to fetch complaints', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Create complaint
router.post('/', [
  authenticateToken,
  body('subject').trim().isLength({ min: 3 }),
  body('description').trim().isLength({ min: 10 }),
  body('relatedTicket').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { subject, description, relatedTicket } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO complaints (customer_id, subject, description, status, related_ticket) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [req.user.id, subject, description, 'open', relatedTicket || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating complaint:', error.stack);
    res.status(500).json({ error: 'Failed to create complaint', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Get complaint by ID
router.get('/:complaintId', authenticateToken, async (req, res) => {
  const { complaintId } = req.params;

  try {
    let query = `
      SELECT c.*, u.name as customer_name
      FROM complaints c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.id = $1
    `;
    let params = [complaintId];

    if (req.user.role === 'customer') {
      query += ' AND c.customer_id = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching complaint:', error.stack);
    res.status(500).json({ error: 'Failed to fetch complaint', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Update complaint status
router.put('/:complaintId/status', [
  authenticateToken,
  requireRole(['admin', 'employee']),
  body('status').isIn(['open', 'in-progress', 'resolved', 'closed'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { complaintId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *',
      [status, complaintId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating complaint status:', error.stack);
    res.status(500).json({ error: 'Failed to update complaint status', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;